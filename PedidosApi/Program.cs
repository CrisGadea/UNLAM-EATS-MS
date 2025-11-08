using Microsoft.EntityFrameworkCore;
using PedidosApi.Data;
using PedidosApi.Models;

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

        if (!await db.Orders.AnyAsync())
        {
            var order = new Order
            {
                CustomerId = "alumno-001",
                RestaurantId = 1,
                Status = OrderStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Items = new List<OrderItem>
                {
                    new OrderItem { NameSnapshot = "Muzzarella", Quantity = 1, PriceSnapshot = 6500m },
                    new OrderItem { NameSnapshot = "Bebida", Quantity = 2, PriceSnapshot = 1200m }
                }
            };
            db.Orders.Add(order);
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

var group = app.MapGroup("/api/pedidos");

group.MapGet("/health", () => Results.Ok("ok"))
    .WithName("PedidosHealth")
    .WithOpenApi();

app.MapGet("/healthz", () => Results.Ok("ok"));

group.MapGet("/", async (string? customerId, int? restaurantId, AppDbContext db) =>
{
    var query = db.Orders.Include(o => o.Items).AsQueryable();
    if (!string.IsNullOrWhiteSpace(customerId)) query = query.Where(o => o.CustomerId == customerId);
    if (restaurantId.HasValue) query = query.Where(o => o.RestaurantId == restaurantId.Value);
    var list = await query.AsNoTracking().OrderByDescending(o => o.CreatedAt).ToListAsync();
    return Results.Ok(list);
})
    .WithName("ListarPedidos")
    .WithOpenApi();

group.MapGet("/{id:int}", async (int id, AppDbContext db) =>
{
    var order = await db.Orders.Include(o => o.Items).AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
    return order is null ? Results.NotFound() : Results.Ok(order);
})
    .WithName("ObtenerPedido")
    .WithOpenApi();

group.MapPost("/", async (Order dto, AppDbContext db) =>
{
    dto.Total = dto.Items.Sum(i => i.PriceSnapshot * i.Quantity);
    db.Orders.Add(dto);
    await db.SaveChangesAsync();
    return Results.Created($"/api/pedidos/{dto.Id}", dto);
})
    .WithName("CrearPedido")
    .WithOpenApi();

group.MapPut("/{id:int}/status", async (int id, OrderStatus status, AppDbContext db) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    order.Status = status;
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("ActualizarEstadoPedido")
    .WithOpenApi();

group.MapPut("/{id:int}/assign", async (int id, string courierId, AppDbContext db) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    order.AssignedCourierId = courierId;
    await db.SaveChangesAsync();
    return Results.NoContent();
})
    .WithName("AsignarRepartidor")
    .WithOpenApi();

app.Run();
