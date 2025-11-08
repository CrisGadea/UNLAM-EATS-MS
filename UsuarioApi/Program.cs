using Microsoft.EntityFrameworkCore;
using UsuarioApi.Models;

var builder = WebApplication.CreateBuilder(args);

// <-- 1. DEFINE EL NOMBRE DE LA POLÍTICA CORS
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// --- INICIO DE LA CONFIGURACIÓN ---
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<UsuariosContext>(options =>
    options.UseSqlServer(connectionString));
// --- FIN DE LA CONFIGURACIÓN ---

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// <-- 2. AÑADE EL SERVICIO DE CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          // Esta es la URL donde corre tu frontend de Angular
                          policy.WithOrigins("http://localhost:4200")
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

var app = builder.Build();


// --- INICIO: CoDIGO DE ARRANQUE AUTOMaTICO ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        // 鈿狅笍 隆IMPORTANTE! Reemplaza 'UsuarioContext' 
        // con el nombre de tu DbContext de usuarios
        var context = services.GetRequiredService<UsuariosContext>();

        logger.LogInformation("Aplicando migraciones de la base de datos de Usuarios...");
        context.Database.Migrate(); // <-- CREA LA BDD Y TABLAS
        logger.LogInformation("Migraciones de Usuarios aplicadas correctamente.");

        // (Opcional pero recomendado para Postman)
        // REEMPLAZA 'Usuario' y 'Usuarios' con tus nombres de entidad y DbSet!
        if (!context.Usuarios.Any())
        {
            logger.LogInformation("BDD de Usuarios vacia. Agregando usuario de prueba...");

            //  REEMPLAZA 'Usuario' y llena tus propiedades
            context.Usuarios.Add(new Usuario
            {
                NombreUsuario = "Usuario Postman",
                Email = "postman@test.com",
                // ... (llena los dems campos que tengas)
            });
            context.SaveChanges();
            logger.LogInformation("Usuario de prueba agregado.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Un error ocurrio durante la migracion o el seeding de la BDD de Usuarios.");
    }
}
// --- FIN: CDIGO DE ARRANQUE AUTOMTICO ---


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// <-- 3. USA LA POLÍTICA DE CORS (¡ANTES DE UseAuthorization!)
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();

app.MapControllers();

app.Run();