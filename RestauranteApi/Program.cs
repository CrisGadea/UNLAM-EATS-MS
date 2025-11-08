using Microsoft.EntityFrameworkCore;
using RestauranteApi.Data;
using RestauranteApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Apply migrations automatically with retry
var maxRetries = 10;
var delay = TimeSpan.FromSeconds(5);
for (var attempt = 1; attempt <= maxRetries; attempt++)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        if (!await db.Restaurants.AnyAsync())
        {
            var r1 = new Restaurant { Name = "Pizzería UNLaM", Address = "Av. San Martín 123", IsOpen = true };
            var r2 = new Restaurant { Name = "Sushi Campus", Address = "Belgrano 456", IsOpen = true };
            db.Restaurants.AddRange(r1, r2);
            await db.SaveChangesAsync();

            db.MenuItems.AddRange(
                new MenuItem { Name = "Muzzarella", Description = "Pizza clásica de muzzarella", Price = 6500m, RestaurantId = r1.Id },
                new MenuItem { Name = "Napolitana", Description = "Tomate y ajo fresco", Price = 7200m, RestaurantId = r1.Id },
                new MenuItem { Name = "Combo 12 piezas", Description = "Variedad de rolls", Price = 9800m, RestaurantId = r2.Id }
            );
            await db.SaveChangesAsync();
        }

        break; // success
    }
    catch
    {
        if (attempt == maxRetries) throw;
        await Task.Delay(delay);
    }
}

app.UseHttpsRedirection();

var group = app.MapGroup("/api/restaurantes");

group.MapGet("/health", () => Results.Ok("ok"))
    .WithName("RestaurantesHealth")
    .WithOpenApi();

app.MapGet("/healthz", () => Results.Ok("ok"));

group.MapGet("/", async (AppDbContext db) =>
    Results.Ok(await db.Restaurants.AsNoTracking().ToListAsync()))
    .WithName("ListarRestaurantes")
    .WithOpenApi();

group.MapGet("", async (AppDbContext db) =>
    Results.Ok(await db.Restaurants.AsNoTracking().ToListAsync()))
    .WithName("ListarRestaurantesNoSlash")
    .WithOpenApi();

group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
{
    var entity = await db.Restaurants.Include(r => r.Menu).AsNoTracking().FirstOrDefaultAsync(r => r.Id == id);
    return entity is null ? Results.NotFound() : Results.Ok(entity);
})
    .WithName("ObtenerRestaurante")
    .WithOpenApi();

group.MapPost("/", async (Restaurant dto, AppDbContext db) =>
{
    db.Restaurants.Add(dto);
    await db.SaveChangesAsync();
    return Results.Created($"/api/restaurantes/{dto.Id}", dto);
})
    .WithName("CrearRestaurante")
    .WithOpenApi();

group.MapPut("/{id:int}", async (int id, Restaurant dto, AppDbContext db) =>
{
    var entity = await db.Restaurants.FindAsync(id);
    if (entity is null) return Results.NotFound();
    entity.Name = dto.Name;
    entity.Address = dto.Address;
    entity.IsOpen = dto.IsOpen;
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("ActualizarRestaurante")
    .WithOpenApi();

group.MapDelete("/{id:int}", async (int id, AppDbContext db) =>
{
    var entity = await db.Restaurants.FindAsync(id);
    if (entity is null) return Results.NotFound();
    db.Restaurants.Remove(entity);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("EliminarRestaurante")
    .WithOpenApi();

// Menu endpoints
group.MapGet("/{id:int}/menu", async (int id, AppDbContext db) =>
{
    var exists = await db.Restaurants.AnyAsync(r => r.Id == id);
    if (!exists) return Results.NotFound();
    var items = await db.MenuItems.Where(m => m.RestaurantId == id).AsNoTracking().ToListAsync();
    return Results.Ok(items);
})
    .WithName("ListarMenu")
    .WithOpenApi();

group.MapPost("/{id:int}/menu", async (int id, MenuItem item, AppDbContext db) =>
{
    var exists = await db.Restaurants.AnyAsync(r => r.Id == id);
    if (!exists) return Results.NotFound();
    item.RestaurantId = id;
    db.MenuItems.Add(item);
    await db.SaveChangesAsync();
    return Results.Created($"/api/restaurantes/{id}/menu/{item.Id}", item);
})
    .WithName("CrearMenuItem")
    .WithOpenApi();

group.MapPut("/{id:int}/menu/{itemId:int}", async (int id, int itemId, MenuItem dto, AppDbContext db) =>
{
    var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == itemId && m.RestaurantId == id);
    if (item is null) return Results.NotFound();
    item.Name = dto.Name;
    item.Description = dto.Description;
    item.Price = dto.Price;
    item.IsAvailable = dto.IsAvailable;
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("ActualizarMenuItem")
    .WithOpenApi();

group.MapDelete("/{id:int}/menu/{itemId:int}", async (int id, int itemId, AppDbContext db) =>
{
    var item = await db.MenuItems.FirstOrDefaultAsync(m => m.Id == itemId && m.RestaurantId == id);
    if (item is null) return Results.NotFound();
    db.MenuItems.Remove(item);
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("EliminarMenuItem")
    .WithOpenApi();

app.Run();
