using Microsoft.EntityFrameworkCore;
using PedidosApi.Data;
using PedidosApi.Models;
using PedidosApi.Contracts;
using Microsoft.AspNetCore.SignalR;
using PedidosApi.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddHealthChecks();
builder.Services.AddCors(options =>
{
    options.AddPolicy("ui", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});
builder.Services.AddSignalR();

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

        // Ensure new nullable column exists without requiring a separate migration file in this demo
        try
        {
            await db.Database.ExecuteSqlRawAsync("IF COL_LENGTH('Orders','RejectionReason') IS NULL ALTER TABLE Orders ADD RejectionReason nvarchar(max) NULL");
        }
        catch { /* ignore if not supported */ }

        if (!await db.Orders.AnyAsync())
        {
            var order = new Order
            {
                CustomerId = "alumno-001",
                RestaurantId = 1,
                Status = OrderStatus.PedidoCreado,
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

app.UseCors("ui");
// HTTPS redirection disabled for gateway HTTP traffic

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

group.MapPost("/from-cart", async (CreateOrderDto dto, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    if (dto.Items.Count == 0) return Results.BadRequest("Debe enviar items");
    var order = new Order
    {
        CustomerId = dto.CustomerId,
        RestaurantId = dto.RestaurantId,
        Status = OrderStatus.PedidoCreado,
        CreatedAt = DateTime.UtcNow,
        Items = dto.Items.Select(i => new OrderItem
        {
            MenuItemId = i.MenuItemId,
            NameSnapshot = i.NameSnapshot,
            PriceSnapshot = i.PriceSnapshot,
            Quantity = i.Quantity
        }).ToList()
    };
    order.Total = order.Items.Sum(i => i.PriceSnapshot * i.Quantity);
    db.Orders.Add(order);
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderCreated", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.Created($"/api/pedidos/{order.Id}", order);
})
    .WithName("CrearPedidoDesdeCarrito")
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

// Estado: aceptar → Preparing
group.MapPut("/{id:int}/accept", async (int id, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    if (order.Status != OrderStatus.PedidoCreado && order.Status != OrderStatus.EnPreparacion)
        return Results.BadRequest("Transición inválida");
    order.Status = OrderStatus.EnPreparacion;
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderUpdated", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.NoContent();
})
    .WithName("AceptarPedido")
    .WithOpenApi();

// Asignar repartidor → Assigned
group.MapPut("/{id:int}/assign-courier", async (int id, AssignCourierDto body, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    if (order.Status != OrderStatus.EnPreparacion)
        return Results.BadRequest("Transición inválida");
    order.AssignedCourierId = body.CourierId;
    order.Status = OrderStatus.RepartidorAsignado;
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderAssigned", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.NoContent();
})
    .WithName("AsignarRepartidorNuevo")
    .WithOpenApi();

// Iniciar reparto → OnTheWay
group.MapPut("/{id:int}/start-delivery", async (int id, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    if (order.Status != OrderStatus.RepartidorAsignado)
        return Results.BadRequest("Transición inválida");
    order.Status = OrderStatus.EnCamino;
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderUpdated", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.NoContent();
})
    .WithName("IniciarReparto")
    .WithOpenApi();

// Entregar → Delivered
group.MapPut("/{id:int}/deliver", async (int id, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    if (order.Status != OrderStatus.EnCamino)
        return Results.BadRequest("Transición inválida");
    order.Status = OrderStatus.Entregado;
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderUpdated", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.NoContent();
})
    .WithName("EntregarPedido")
    .WithOpenApi();

// Rechazar pedido → Rechazado (con motivo)
group.MapPut("/{id:int}/reject", async (int id, string reason, AppDbContext db, IHubContext<OrderHub> hub) =>
{
    var order = await db.Orders.FindAsync(id);
    if (order is null) return Results.NotFound();
    var raw = (int)order.Status;
    if (order.Status != OrderStatus.PedidoCreado && order.Status != OrderStatus.EnPreparacion && raw != 1)
        return Results.BadRequest("Solo se puede rechazar cuando el pedido está en 'Pedido Creado' o 'En preparación'. (Se admite estado legado 1)");
    order.Status = OrderStatus.Rechazado;
    order.RejectionReason = reason;
    await db.SaveChangesAsync();
    await hub.Clients.All.SendAsync("orderUpdated", order);
    await hub.Clients.All.SendAsync("statusChanged", new { id = order.Id, status = order.Status, at = DateTime.UtcNow });
    return Results.NoContent();
})
    .WithName("RechazarPedido")
    .WithOpenApi();

// Repartidores mock endpoints (in-memory)
var couriers = new List<CourierDto>
{
    new("courier-1", "Carlos"),
    new("courier-2", "Ana"),
    new("courier-3", "Lucía")
};

app.MapGet("/api/repartidores", () => Results.Ok(couriers));

app.MapPost("/api/repartidores", (CourierDto payload) =>
{
    if (payload == null || string.IsNullOrWhiteSpace(payload.Id) || string.IsNullOrWhiteSpace(payload.Name))
        return Results.BadRequest();
    if (couriers.Any(c => c.Id == payload.Id))
        return Results.Conflict();
    couriers.Add(payload);
    return Results.Created($"/api/repartidores/{payload.Id}", payload);
});

// Hubs
app.MapHub<OrderHub>("/hubs/orders");

app.Run();
