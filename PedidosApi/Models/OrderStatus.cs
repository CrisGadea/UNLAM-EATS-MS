namespace PedidosApi.Models;

public enum OrderStatus
{
    PedidoCreado = 0,
    // Accepted (1) removed in favor of EnPreparacion directly after acceptance
    EnPreparacion = 2,
    RepartidorAsignado = 3,
    EnCamino = 4,
    Entregado = 5,
    Rechazado = 6
}
