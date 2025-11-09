using System.Text.Json.Serialization;
namespace PedidosApi.Models;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int MenuItemId { get; set; }
    public string NameSnapshot { get; set; } = string.Empty;
    public decimal PriceSnapshot { get; set; }
    public int Quantity { get; set; }

    [JsonIgnore]
    public Order? Order { get; set; }
}
