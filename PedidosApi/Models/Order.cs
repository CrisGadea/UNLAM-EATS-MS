using System.ComponentModel.DataAnnotations;

namespace PedidosApi.Models;

public class Order
{
    public int Id { get; set; }
    [Required]
    public string CustomerId { get; set; } = string.Empty;
    public int RestaurantId { get; set; }
    public decimal Total { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? AssignedCourierId { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
