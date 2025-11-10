using Microsoft.EntityFrameworkCore;
using ProductosApi.Models;
using ProductosApi.Services;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

Console.WriteLine($"---> USANDO ConnectionString: {connectionString}");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngularApp",
        policyBuilder =>
        {
            policyBuilder.WithOrigins("http://localhost:4200")
                         .AllowAnyHeader()
                         .AllowAnyMethod();
        });
});


builder.Services.AddDbContext<ProductoContext>(options =>
    options.UseSqlServer(connectionString, sqlServerOptionsAction: sqlOptions =>
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    }));

builder.Services.AddScoped<IProductoService, ProductoService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<ProductoContext>();

        logger.LogInformation("Aplicando migraciones de la base de datos...");
        context.Database.Migrate();
        logger.LogInformation("Migraciones aplicadas correctamente.");

        if (!context.Productos.Any())
        {
            logger.LogInformation("Base de datos vacía. Agregando datos de prueba...");

            var categoriaPrueba = new Categoria { Nombre = "Categoría de Prueba" };
            context.Categorias.Add(categoriaPrueba);
            context.SaveChanges(); 

            logger.LogInformation($"Categoría de prueba agregada con Id: {categoriaPrueba.Id}");

            context.Productos.Add(new Producto
            {
                Nombre = "Producto de Prueba (Auto-generado)",
                Precio = 100,
                Stock = 50,
                Descripcion = "Creado automáticamente por el Seeding",
                Disponible = true,
                CategoriaId = categoriaPrueba.Id 
            });
            context.SaveChanges();
            logger.LogInformation("Producto de prueba agregado.");

        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Un error ocurrió durante la migración o el seeding de la BDD.");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseHttpsRedirection();

app.UseCors("AllowAngularApp");

app.UseAuthorization();

app.MapControllers();

app.Run();