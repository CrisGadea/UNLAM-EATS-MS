using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProductosApi.Models;
using ProductosApi.Services;

namespace ProductosApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProductosController : ControllerBase
    {
        private readonly IProductoService _productoService;

        public ProductosController(IProductoService productoService)
        {
            _productoService = productoService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Producto>>> GetProductos(
            [FromQuery] string? nombre,
            [FromQuery] decimal? precioMax)
        {
            var productos = await _productoService.GetProductosAsync(nombre, precioMax);
            return Ok(productos);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProducto(int id)
        {
            var producto = await _productoService.GetProductoByIdAsync(id);

            if (producto == null)
            {
                return NotFound();
            }

            return Ok(producto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            if (id != producto.Id)
            {
                return BadRequest();
            }

            if (string.IsNullOrWhiteSpace(producto.Nombre))
                return BadRequest("El nombre no puede estar vacío.");
            if (producto.Precio < 0)
                return BadRequest("El precio no puede ser negativo.");

            if (await _productoService.CheckIfNameExistsAsync(producto.Nombre, id))
            {
                return Conflict("Ya existe otro producto con ese nombre.");
            }

            var resultado = await _productoService.UpdateProductoAsync(id, producto);

            if (!resultado)
            {
                return NotFound();
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            if (string.IsNullOrWhiteSpace(producto.Nombre))
                return BadRequest("El nombre no puede estar vacío.");
            if (producto.Precio < 0)
                return BadRequest("El precio no puede ser negativo.");

            if (await _productoService.CheckIfNameExistsAsync(producto.Nombre))
            {
                return Conflict("Ya existe un producto con ese nombre.");
            }

            try
            {
                var productoCreado = await _productoService.CreateProductoAsync(producto);
                return CreatedAtAction(nameof(GetProducto), new { id = productoCreado.Id }, productoCreado);
            }
            catch (DbUpdateException)
            {
                return StatusCode(500, "Error al guardar el producto.");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var resultado = await _productoService.DeleteProductoAsync(id);
            if (!resultado)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}