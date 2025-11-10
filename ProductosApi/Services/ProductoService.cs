using Microsoft.EntityFrameworkCore;
using ProductosApi.Models;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ProductosApi.Services
{
    public class ProductoService : IProductoService
    {
        private readonly ProductoContext _context;

        public ProductoService(ProductoContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Producto>> GetProductosAsync(string? nombre, decimal? precioMax)
        {
            var query = _context.Productos.AsQueryable();

            if (!string.IsNullOrEmpty(nombre))
            {
                query = query.Where(p => p.Nombre.Contains(nombre));
            }

            if (precioMax.HasValue)
            {
                query = query.Where(p => p.Precio <= precioMax.Value);
            }

            return await query.ToListAsync();
        }

        public async Task<Producto?> GetProductoByIdAsync(int id)
        {
            return await _context.Productos.FindAsync(id);
        }

        public async Task<Producto> CreateProductoAsync(Producto producto)
        {
            producto.Disponible = (producto.Stock > 0);

            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();
            return producto;
        }

        public async Task<bool> UpdateProductoAsync(int id, Producto producto)
        {
            var productoExistente = await _context.Productos.FindAsync(id);
            if (productoExistente == null)
            {
                return false;
            }

            producto.Disponible = (producto.Stock > 0);

            _context.Entry(productoExistente).CurrentValues.SetValues(producto);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Productos.Any(e => e.Id == id))
                {
                    return false;
                }
                else
                {
                    throw;
                }
            }
            return true;
        }

        public async Task<bool> DeleteProductoAsync(int id)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                return false;
            }

            _context.Productos.Remove(producto);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CheckIfNameExistsAsync(string nombre, int? idToIgnore = null)
        {
            var query = _context.Productos.AsQueryable();

            if (idToIgnore.HasValue)
            {
                query = query.Where(p => p.Id != idToIgnore.Value);
            }

            return await query.AnyAsync(p => p.Nombre.ToLower() == nombre.ToLower());
        }
    }
}