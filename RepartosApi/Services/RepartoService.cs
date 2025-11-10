using RepartosApi.Data.DTOs;
using RepartosApi.Data.Entidades;
using System.Net.Http;

namespace RepartosApi.Services
{

    public interface IRepartoService
    {
        void AgregarReparto(Reparto reparto);
        void EliminarReparto(int id);
        List<Reparto> ObtenerRepartos();
        Reparto? ObtenerRepartoPorId(int id);
        void ActualizarReparto(Reparto reparto);

        Task<Reparto?> AsignarRepartidorAsync(int idReparto, int idRepartidor);

        Task<Reparto?> CambiarEstadoAsync(int idReparto, EstadoReparto nuevoEstado);

    }

    public class RepartoService : IRepartoService
    {
        private readonly RepartosDbContext _context;
        private readonly HttpClient _httpClient;

        public RepartoService(RepartosDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;

        }

        public void AgregarReparto(Reparto reparto)
        {
            reparto.FechaAsignacion = DateTime.Now;
            _context.Repartos.Add(reparto);
            _context.SaveChanges();
        }
        public void EliminarReparto(int id)
        {
            var reparto = _context.Repartos.Find(id);  
            if(reparto!= null)
            {
                _context.Repartos.Remove(reparto);
                _context.SaveChanges();
            }
        }

        public void ActualizarReparto(Reparto reparto)
        {
            _context.Repartos.Update(reparto);
            _context.SaveChanges();
        }

        public Reparto? ObtenerRepartoPorId(int id)
        {
            return _context.Repartos.Find(id);
        }

        public List<Reparto> ObtenerRepartos()
        {
           return _context.Repartos.ToList();  
        }

        public async Task<Reparto?> AsignarRepartidorAsync(int idReparto, int idRepartidor)
        {
            var reparto = await _context.Repartos.FindAsync(idReparto);
            if (reparto == null) return null;

            reparto.IdRepartidor = idRepartidor;
            reparto.Estado = EstadoReparto.ASIGNADO;
            reparto.FechaAsignacion = DateTime.Now;

            _context.Repartos.Update(reparto);
            _context.SaveChanges();

            return reparto;

        }

        public async Task<Reparto?> CambiarEstadoAsync(int idReparto, EstadoReparto nuevoEstado)
        {

            var reparto = await _context.Repartos.FindAsync(idReparto);
            if (reparto == null) return null;

            reparto.Estado = nuevoEstado;

            if(nuevoEstado == EstadoReparto.ENTREGADO)
            {
                reparto.FechaEntrega = DateTime.Now;
            }

            _context.Repartos.Update(reparto);
            await _context.SaveChangesAsync();

            return reparto;

        }
    }
}
    