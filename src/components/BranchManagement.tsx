import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin, 
  Navigation, 
  ExternalLink, 
  Users, 
  X, 
  CheckCircle2, 
  AlertTriangle,
  Search,
  Globe,
  ClipboardCheck,
  Map as MapIcon
} from 'lucide-react';
import { BranchLocation, Employee } from '../types';
import { saveBranch, deleteBranch } from '../services/api';

interface BranchManagementProps {
  branches: BranchLocation[];
  employees: Employee[];
  onRefresh: () => void;
}

export const BranchManagement: React.FC<BranchManagementProps> = ({
  branches,
  employees,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<BranchLocation | null>(null);

  // Form states
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('-34.6037');
  const [longitude, setLongitude] = useState<string>('-58.3816');

  // Search & Map Picker state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingAddress, setSearchingAddress] = useState<boolean>(false);
  const [pasteGoogleLink, setPasteGoogleLink] = useState<string>('');
  const [showMapPicker, setShowMapPicker] = useState<boolean>(true);

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gettingGPS, setGettingGPS] = useState<boolean>(false);

  // Delete modal state
  const [deletingBranch, setDeletingBranch] = useState<BranchLocation | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Map ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  // Load Leaflet dynamically for interactive map selection
  useEffect(() => {
    if (showModal) {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initLeafletMap();
        document.body.appendChild(script);
      } else {
        setTimeout(() => initLeafletMap(), 100);
      }
    } else {
      destroyLeafletMap();
    }
  }, [showModal]);

  const destroyLeafletMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    }
  };

  const initLeafletMap = () => {
    if (!mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const latNum = parseFloat(latitude) || -34.6037;
    const lngNum = parseFloat(longitude) || -58.3816;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latNum, lngNum], 15);
      if (markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([latNum, lngNum]);
      }
      return;
    }

    try {
      const map = L.map(mapContainerRef.current).setView([latNum, lngNum], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([latNum, lngNum], { draggable: true }).addTo(map);
      
      marker.on('dragend', (e: any) => {
        const position = e.target.getLatLng();
        setLatitude(position.lat.toFixed(6));
        setLongitude(position.lng.toFixed(6));
        reverseGeocode(position.lat, position.lng);
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
        reverseGeocode(lat, lng);
      });

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
    } catch (err) {
      console.error('Error initializing map:', err);
    }
  };

  // Update map marker when latitude/longitude states change
  useEffect(() => {
    if (mapInstanceRef.current && markerInstanceRef.current) {
      const latNum = parseFloat(latitude);
      const lngNum = parseFloat(longitude);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        markerInstanceRef.current.setLatLng([latNum, lngNum]);
        mapInstanceRef.current.setView([latNum, lngNum], 15);
      }
    }
  }, [latitude, longitude]);

  // Search Address Geocoding
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchingAddress(true);
    setSearchResults([]);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&limit=5&countrycodes=ar`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSearchResults(data);
      } else {
        setErrorMsg('No se encontraron resultados para la búsqueda especificada.');
      }
    } catch (err) {
      setErrorMsg('Error al buscar la dirección en el servicio de mapas.');
    } finally {
      setSearchingAddress(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat).toFixed(6);
    const lon = parseFloat(result.lon).toFixed(6);
    setLatitude(lat);
    setLongitude(lon);
    setAddress(result.display_name);
    if (!name) {
      const parts = result.display_name.split(',');
      setName(`Sucursal ${parts[0]}`);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  // Reverse geocoding to update address when map clicked
  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
      }
    } catch (e) {
      // ignore
    }
  };

  // Parse pasted Google Maps link or coordinates
  const handleParseGoogleMapsPaste = () => {
    if (!pasteGoogleLink.trim()) return;

    // Pattern 1: coordinates like -34.6037, -58.3816
    const coordMatch = pasteGoogleLink.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      setLatitude(coordMatch[1]);
      setLongitude(coordMatch[2]);
      setPasteGoogleLink('');
      return;
    }

    // Pattern 2: Google Maps URL containing @lat,lng
    const urlMatch = pasteGoogleLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (urlMatch) {
      setLatitude(urlMatch[1]);
      setLongitude(urlMatch[2]);
      setPasteGoogleLink('');
      return;
    }

    setErrorMsg('No se pudieron extraer coordenadas del texto o enlace ingresado.');
  };

  const handleOpenGoogleMapsSearch = () => {
    const query = address || name || 'Argentina';
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const resetForm = () => {
    setName('');
    setAddress('');
    setLatitude('-34.6037');
    setLongitude('-58.3816');
    setSearchQuery('');
    setSearchResults([]);
    setPasteGoogleLink('');
    setErrorMsg(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingBranch(null);
    setShowModal(true);
  };

  const handleOpenEdit = (branch: BranchLocation) => {
    setEditingBranch(branch);
    setName(branch.name);
    setAddress(branch.address);
    setLatitude(String(branch.latitude));
    setLongitude(String(branch.longitude));
    setSearchQuery('');
    setSearchResults([]);
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleGetCurrentGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('La geolocalización no está soportada por su navegador.');
      return;
    }
    setGettingGPS(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGettingGPS(false);
      },
      (err) => {
        setErrorMsg('No se pudo obtener la ubicación GPS actual: ' + err.message);
        setGettingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      setErrorMsg('El nombre y la dirección son obligatorios.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await saveBranch({
        id: editingBranch ? editingBranch.id : undefined,
        name: name.trim(),
        address: address.trim(),
        latitude: parseFloat(latitude) || -34.6037,
        longitude: parseFloat(longitude) || -58.3816,
      });

      setShowModal(false);
      resetForm();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la sucursal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBranch) return;
    setIsDeleting(true);

    try {
      await deleteBranch(deletingBranch.id);
      setDeletingBranch(null);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la sucursal.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800" />
            Gestión de Sucursales (ABM)
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Alta, Baja y Modificación de sedes operativas, oficinas y geocercas GPS.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Nueva Sucursal</span>
        </button>
      </div>

      {/* Grid of Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {branches.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
            No hay sucursales registradas en la plataforma.
          </div>
        ) : (
          branches.map((b) => {
            const assignedEmps = employees.filter((e) => e.branch === b.name && e.active);

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-slate-300 transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 bg-slate-900 text-white rounded-xl shrink-0 mt-0.5">
                        <Building2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{b.name}</h4>
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                          {b.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-xl border border-slate-300 transition cursor-pointer"
                        title="Editar Sucursal (Modificación)"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingBranch(b)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-2 rounded-xl border border-rose-200 transition cursor-pointer"
                        title="Eliminar Sucursal (Baja)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Details Badge & GPS Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 uppercase font-extrabold block">Personal Asignado</span>
                      <span className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3.5 h-3.5 text-blue-700" />
                        {assignedEmps.length} Empleados Activos
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 uppercase font-extrabold block">Geocerca GPS</span>
                      <span className="font-mono text-[11px] text-slate-800 font-bold block mt-0.5">
                        {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Footer map link */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Radio de Cobertura &lt; 100 metros
                  </span>

                  <a
                    href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
                  >
                    <span>Ver mapa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Branch Modal (Alta y Modificación) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm">
                  {editingBranch ? 'Modificar Sucursal' : 'Alta de Nueva Sucursal'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs max-h-[85vh] overflow-y-auto">
              
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Sucursal San Isidro Inmobiliaria"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {/* Address Search & Google Maps Tools */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-800 text-[11px] uppercase flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Buscar Dirección en Mapa</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={handleOpenGoogleMapsSearch}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition flex items-center gap-1 cursor-pointer"
                    title="Abrir Google Maps en otra pestaña para buscar la ubicación exacta"
                  >
                    <Globe className="w-3 h-3 text-blue-600" />
                    <span>Abrir Google Maps</span>
                  </button>
                </div>

                {/* Address Search Bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(e)}
                    placeholder="Escriba la dirección (ej: Av. Libertador 14200, San Isidro)"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchAddress()}
                    disabled={searchingAddress}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${searchingAddress ? 'animate-spin' : ''}`} />
                    <span>{searchingAddress ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>

                {/* Search Results dropdown list */}
                {searchResults.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                    <span className="text-[10px] font-bold text-slate-400 px-2 block">Resultados encontrados:</span>
                    {searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 text-slate-800 font-medium text-[11px] border border-transparent hover:border-emerald-200 transition flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{res.display_name}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Google Maps link / coordinates parser */}
                <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={pasteGoogleLink}
                    onChange={(e) => setPasteGoogleLink(e.target.value)}
                    placeholder="O pegue coordenadas o enlace de Google Maps (-34.6037, -58.3816)"
                    className="flex-1 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={handleParseGoogleMapsPaste}
                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                  >
                    <ClipboardCheck className="w-3 h-3" />
                    <span>Aplicar</span>
                  </button>
                </div>

              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Dirección Física *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej. Av. del Libertador 14200, San Isidro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {/* Interactive Map Picker */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-[11px] uppercase flex items-center gap-1">
                    <MapIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Seleccionar Punto en el Mapa (Haga clic para mover pin)</span>
                  </span>

                  <button
                    type="button"
                    onClick={handleGetCurrentGPS}
                    disabled={gettingGPS}
                    className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className={`w-3 h-3 ${gettingGPS ? 'animate-spin' : ''}`} />
                    {gettingGPS ? 'GPS...' : 'Mi GPS'}
                  </button>
                </div>

                {/* Leaflet map div container */}
                <div 
                  ref={mapContainerRef} 
                  className="w-full h-48 rounded-xl border border-slate-300 shadow-inner z-0 overflow-hidden bg-slate-200 relative"
                />

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Latitud</label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Longitud</label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  {saving ? 'Guardando...' : (editingBranch ? 'Guardar Cambios' : 'Crear Sucursal')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Baja) */}
      {deletingBranch && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden space-y-4 p-5">
            
            <div className="flex items-start space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">¿Eliminar Sucursal?</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Está por dar de baja la sucursal <strong className="text-slate-900">{deletingBranch.name}</strong> ({deletingBranch.address}).
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-medium space-y-1">
              <p>
                <strong>Atención:</strong> Si elimina esta sucursal, asegúrese de reasignar previamente a los empleados asignados a esta sede.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingBranch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Dar de Baja'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
