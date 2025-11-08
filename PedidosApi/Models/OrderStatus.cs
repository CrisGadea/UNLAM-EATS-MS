namespace PedidosApi.Models;

public enum OrderStatus
{
    Pending = 0,
    Accepted = 1,
    Preparing = 2,
    OnTheWay = 3,
    Delivered = 4,
    Cancelled = 5
}
