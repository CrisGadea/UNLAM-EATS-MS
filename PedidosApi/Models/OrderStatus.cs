namespace PedidosApi.Models;

public enum OrderStatus
{
    Pending = 0,
    Accepted = 1,
    Preparing = 2,
    Assigned = 3,
    OnTheWay = 4,
    Delivered = 5,
    Cancelled = 6
}
