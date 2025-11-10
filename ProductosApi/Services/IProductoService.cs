using ProductosApi.Models;

namespace ProductosApi.Services
{
    public interface IProductoService
    {
        Task<IEnumerable<Producto>> GetProductosAsync(string? nombre, decimal? precioMax);

        Task<Producto?> GetProductoByIdAsync(int id);

        Task<Producto> CreateProductoAsync(Producto producto);

        Task<bool> UpdateProductoAsync(int id, Producto producto);

        Task<bool> DeleteProductoAsync(int id);

        Task<bool> CheckIfNameExistsAsync(string nombre, int? idToIgnore = null);
    }
}