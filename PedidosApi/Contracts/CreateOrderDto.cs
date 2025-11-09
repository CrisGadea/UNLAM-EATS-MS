namespace PedidosApi.Contracts;

public class CreateOrderDto
{
    public string CustomerId { get; set; } = string.Empty;
    public int RestaurantId { get; set; }
    public List<CreateOrderItemDto> Items { get; set; } = new();
}

public class CreateOrderItemDto
{
    public int MenuItemId { get; set; }
    public string NameSnapshot { get; set; } = string.Empty;
    public decimal PriceSnapshot { get; set; }
    public int Quantity { get; set; }
}
