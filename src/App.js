import React, { useState, useEffect, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

// Asegúrate de que Tailwind CSS y Font Awesome estén cargados en tu index.html
// <script src="https://cdn.tailwindcss.com"></script>
// <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
// <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"></link>

// Configuración de Tailwind CSS para la fuente Inter
// Agrega esto en un script en tu index.html antes del script de React:
/*
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
};
*/

// Contexto de Firebase para compartir la instancia de la base de datos y autenticación
const FirebaseContext = createContext(null);

// Componente principal de la aplicación
function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Nuevo estado para controlar si el usuario está logueado
  const [currentView, setCurrentView] = useState("dashboard"); // Vistas: 'dashboard', 'shifts', 'clients', 'payments'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inicialización de Firebase y manejo de autenticación
  useEffect(() => {
    try {
      // Se obtienen las variables globales proporcionadas por el entorno de Canvas
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const firebaseConfig = JSON.parse(
        typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
      );

      if (!Object.keys(firebaseConfig).length) {
        throw new Error("La configuración de Firebase no está disponible.");
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      // Escuchar cambios en el estado de autenticación
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          // Si el usuario ya está autenticado
          setUserId(user.uid);
          setIsLoggedIn(true);
        } else {
          // Si no hay usuario, no está logueado
          setUserId(null);
          setIsLoggedIn(false);
        }
        setIsAuthReady(true); // La autenticación ha sido verificada
        setLoading(false);
      });

      // Limpiar el listener al desmontar el componente
      return () => unsubscribe();
    } catch (initError) {
      console.error("Error al inicializar Firebase:", initError);
      setError(
        "Error al inicializar la aplicación. Por favor, recarga la página."
      );
      setLoading(false);
    }
  }, []); // Se ejecuta solo una vez al montar el componente

  // Función para cerrar sesión
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentView("dashboard"); // Volver al dashboard o a la pantalla de inicio de sesión
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
      setError("Error al cerrar sesión.");
    }
  };

  // Muestra un mensaje de carga mientras la aplicación se inicializa
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-lg font-semibold text-gray-700">
          Cargando aplicación...
        </div>
      </div>
    );
  }

  // Muestra un mensaje de error si la inicialización falla
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700 p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  // Muestra la pantalla de autenticación si el usuario no está logueado
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 font-inter antialiased flex items-center justify-center">
        <AuthScreen auth={auth} />
      </div>
    );
  }

  // Provee los servicios de Firebase a los componentes hijos a través del contexto
  return (
    <FirebaseContext.Provider value={{ db, auth, userId, isLoggedIn }}>
      <div className="min-h-screen bg-gray-100 font-inter antialiased">
        <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg rounded-b-xl">
          <h1 className="text-3xl font-bold text-center">
            Gestión de Gimnasio
          </h1>
          <p className="text-sm text-center mt-1">ID de Usuario: {userId}</p>
          <nav className="mt-4 flex justify-center space-x-4 flex-wrap">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentView === "dashboard"
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              <i className="fas fa-home mr-2"></i> Dashboard
            </button>
            <button
              onClick={() => setCurrentView("shifts")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentView === "shifts"
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              <i className="fas fa-calendar-alt mr-2"></i> Turnos
            </button>
            <button
              onClick={() => setCurrentView("clients")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentView === "clients"
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              <i className="fas fa-users mr-2"></i> Clientes
            </button>
            <button
              onClick={() => setCurrentView("payments")}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                currentView === "payments"
                  ? "bg-white text-blue-700 shadow-md"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              <i className="fas fa-dollar-sign mr-2"></i> Pagos
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-300"
            >
              <i className="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión
            </button>
          </nav>
        </header>

        <main className="p-4">
          {currentView === "dashboard" && <Dashboard />}
          {currentView === "shifts" && <Shifts />}
          {currentView === "clients" && <Clients />}
          {currentView === "payments" && <Payments />}
        </main>
      </div>
    </FirebaseContext.Provider>
  );
}

// Hook personalizado para acceder a los servicios de Firebase desde cualquier componente
const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error(
      "useFirebase debe ser utilizado dentro de un FirebaseProvider"
    );
  }
  return context;
};

// Componente de Modal de Confirmación genérico
function ConfirmModal({ show, title, message, onConfirm, onCancel }) {
  if (!show) return null; // No renderiza si 'show' es falso

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm mx-4 text-center">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de la pantalla de autenticación (Login/Registro)
function AuthScreen({ auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' o 'error'

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 5000); // Oculta el mensaje después de 5 segundos
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage(""); // Limpiar mensajes anteriores
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        showMessage("Registro exitoso. ¡Bienvenido!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage(
          "Inicio de sesión exitoso. ¡Bienvenido de nuevo!",
          "success"
        );
      }
    } catch (error) {
      console.error("Error de autenticación:", error);
      let errorMessage = "Error de autenticación.";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "El correo electrónico ya está en uso.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "El formato del correo electrónico es inválido.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La contraseña debe tener al menos 6 caracteres.";
      } else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        errorMessage =
          "Credenciales inválidas. Verifica tu correo y contraseña.";
      } else if (error.code === "auth/operation-not-allowed") {
        errorMessage =
          "La autenticación por correo/contraseña no está habilitada en tu proyecto de Firebase. Por favor, habilítala en la consola de Firebase (Authentication > Sign-in method).";
      }
      showMessage(errorMessage, "error");
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4 text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        {isRegistering ? "Registrarse" : "Iniciar Sesión"}
      </h2>

      {message && (
        <div
          className={`p-3 mb-4 rounded-lg font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Correo Electrónico"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Contraseña"
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 w-full"
        >
          {isRegistering ? "Registrarse" : "Iniciar Sesión"}
        </button>
      </form>

      <button
        onClick={() => setIsRegistering(!isRegistering)}
        className="mt-6 text-blue-600 hover:text-blue-800 font-semibold transition duration-300"
      >
        {isRegistering
          ? "¿Ya tienes una cuenta? Inicia Sesión"
          : "¿No tienes una cuenta? Regístrate"}
      </button>
    </div>
  );
}

// Componente Dashboard: Muestra un resumen de la actividad del gimnasio
function Dashboard() {
  const { db, userId } = useFirebase(); // Obtiene la instancia de la base de datos y el ID de usuario
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !userId) return; // Asegura que Firebase esté inicializado y el userId disponible

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    // Referencias a las colecciones de Firestore para el usuario actual
    const shiftsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/shifts`
    );
    const clientsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/clients`
    );
    const paymentsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/payments`
    );

    // Suscripción en tiempo real a los turnos
    const unsubscribeShifts = onSnapshot(
      shiftsRef,
      (snapshot) => {
        const shiftsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setShifts(shiftsData);
        setLoading(false);
      },
      (err) => {
        console.error("Error al obtener turnos:", err);
        setError("Error al cargar turnos.");
        setLoading(false);
      }
    );

    // Suscripción en tiempo real a los clientes
    const unsubscribeClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      },
      (err) => {
        console.error("Error al obtener clientes:", err);
        setError("Error al cargar clientes.");
      }
    );

    // Suscripción en tiempo real a los pagos
    const unsubscribePayments = onSnapshot(
      paymentsRef,
      (snapshot) => {
        const paymentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPayments(paymentsData);
      },
      (err) => {
        console.error("Error al obtener pagos:", err);
        setError("Error al cargar pagos.");
      }
    );

    // Función de limpieza para desuscribirse de los listeners al desmontar el componente
    return () => {
      unsubscribeShifts();
      unsubscribeClients();
      unsubscribePayments();
    };
  }, [db, userId]); // Se re-ejecuta si 'db' o 'userId' cambian

  // Calcula el ingreso total sumando los montos de todos los pagos
  const totalIncome = payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );

  // Filtra y ordena los próximos turnos para mostrar solo los 5 más cercanos
  const upcomingShifts = shifts
    .filter((shift) => {
      const shiftDateTime = new Date(`${shift.date}T${shift.time}`);
      return shiftDateTime > new Date(); // Solo turnos en el futuro
    })
    .sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA - dateB; // Ordena por fecha y hora ascendente
    })
    .slice(0, 5); // Muestra solo los primeros 5

  // Función para obtener el estado de pago de un cliente
  const getPaymentStatus = (clientId) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() es 0-indexado
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();

    // Buscar un pago para el cliente en el mes y año actual
    const hasPaidThisMonth = payments.some(
      (payment) =>
        payment.clientId === clientId &&
        payment.paymentMonth === currentMonth &&
        payment.paymentYear === currentYear
    );

    if (hasPaidThisMonth) {
      return {
        status: "Al día",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    } else {
      // Si es después del día 10 y no ha pagado, está vencido
      if (dayOfMonth > 10) {
        return {
          status: "Vencido",
          color: "text-red-600",
          bgColor: "bg-red-100",
        };
      } else {
        // Si es el día 10 o antes y no ha pagado, está pendiente
        return {
          status: "Pendiente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
        };
      }
    }
  };

  // Calcular el número de clientes con pagos vencidos
  const overdueClientsCount = clients.filter((client) => {
    const status = getPaymentStatus(client.id);
    return status.status === "Vencido";
  }).length;

  if (loading)
    return <div className="text-center py-8">Cargando dashboard...</div>;
  if (error)
    return <div className="text-center text-red-500 py-8">{error}</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Resumen del Gimnasio
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta de Clientes Totales */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-blue-200 hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold text-blue-700 mb-3 flex items-center">
            <i className="fas fa-users mr-3 text-blue-500"></i> Total Clientes
          </h3>
          <p className="text-4xl font-bold text-gray-900">{clients.length}</p>
        </div>
        {/* Tarjeta de Turnos Activos */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-purple-200 hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold text-purple-700 mb-3 flex items-center">
            <i className="fas fa-calendar-alt mr-3 text-purple-500"></i> Turnos
            Activos
          </h3>
          <p className="text-4xl font-bold text-gray-900">{shifts.length}</p>
        </div>
        {/* Tarjeta de Ingresos Totales */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-shadow">
          <h3 className="text-xl font-semibold text-green-700 mb-3 flex items-center">
            <i className="fas fa-dollar-sign mr-3 text-green-500"></i> Ingresos
            Totales
          </h3>
          <p className="text-4xl font-bold text-gray-900">
            ${totalIncome.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Sección de Clientes con Mensualidad Vencida */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-red-200">
        <h3 className="text-2xl font-semibold text-red-700 mb-4 flex items-center">
          <i className="fas fa-exclamation-triangle mr-3 text-red-500"></i>{" "}
          Mensualidades Vencidas
        </h3>
        <p className="text-4xl font-bold text-red-900">{overdueClientsCount}</p>
        {overdueClientsCount > 0 && (
          <p className="text-gray-600 mt-2">
            Hay {overdueClientsCount} cliente(s) con mensualidades vencidas.
          </p>
        )}
        {overdueClientsCount === 0 && (
          <p className="text-gray-600 mt-2">
            ¡Todos los clientes están al día o pendientes!
          </p>
        )}
      </div>

      {/* Sección de Próximos Turnos */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-clock mr-3 text-gray-600"></i> Próximos Turnos
        </h3>
        {upcomingShifts.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {upcomingShifts.map((shift) => (
              <li
                key={shift.id}
                className="py-3 flex justify-between items-center"
              >
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {shift.date} a las {shift.time}
                  </p>
                  <p className="text-sm text-gray-600">
                    {shift.bookedClients ? shift.bookedClients.length : 0} /{" "}
                    {shift.capacity} personas
                  </p>
                </div>
                <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                  Activo
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">No hay próximos turnos programados.</p>
        )}
      </div>
    </div>
  );
}

// Componente Shifts: Gestiona los turnos del gimnasio
function Shifts() {
  const { db, userId } = useFirebase();
  const [shifts, setShifts] = useState([]);
  const [clients, setClients] = useState([]); // Lista de clientes para la reserva
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [showEditShiftModal, setShowEditShiftModal] = useState(false);
  const [currentShift, setCurrentShift] = useState(null);
  const [newShiftDate, setNewShiftDate] = useState("");
  const [newShiftTime, setNewShiftTime] = useState("");
  const [newShiftCapacity, setNewShiftCapacity] = useState(10);
  const [selectedClientForBooking, setSelectedClientForBooking] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // 'success' o 'error'
  const [showConfirmDeleteShiftModal, setShowConfirmDeleteShiftModal] =
    useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);

  useEffect(() => {
    if (!db || !userId) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const shiftsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/shifts`
    );
    const clientsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/clients`
    );

    // Suscripción en tiempo real a los turnos
    const unsubscribeShifts = onSnapshot(
      shiftsRef,
      (snapshot) => {
        const shiftsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setShifts(
          shiftsData.sort((a, b) => {
            // Ordena los turnos por fecha y hora
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
          })
        );
      },
      (err) => {
        console.error("Error al obtener turnos:", err);
        showMessage("Error al cargar turnos.", "error");
      }
    );

    // Suscripción en tiempo real a los clientes (para la funcionalidad de reserva)
    const unsubscribeClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      },
      (err) => {
        console.error("Error al obtener clientes:", err);
        showMessage("Error al cargar clientes para reservas.", "error");
      }
    );

    return () => {
      unsubscribeShifts();
      unsubscribeClients();
    };
  }, [db, userId]);

  // Función para mostrar mensajes de éxito o error
  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000); // Oculta el mensaje después de 3 segundos
  };

  // Manejador para agregar un nuevo turno
  const handleAddShift = async () => {
    if (!newShiftDate || !newShiftTime || newShiftCapacity <= 0) {
      showMessage(
        "Por favor, completa todos los campos para el turno.",
        "error"
      );
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/shifts`),
        {
          date: newShiftDate,
          time: newShiftTime,
          capacity: Number(newShiftCapacity),
          bookedClients: [], // Inicialmente, no hay clientes reservados
          createdAt: serverTimestamp(), // Marca de tiempo de creación
          gymId: appId, // ID del gimnasio (para escalabilidad)
          userId: userId, // ID del usuario que creó el turno
        }
      );
      showMessage("Turno agregado exitosamente.", "success");
      setShowAddShiftModal(false); // Cierra el modal
      // Resetea los campos del formulario
      setNewShiftDate("");
      setNewShiftTime("");
      setNewShiftCapacity(10);
    } catch (e) {
      console.error("Error al agregar turno:", e);
      showMessage("Error al agregar turno.", "error");
    }
  };

  // Prepara el modal de edición con los datos del turno seleccionado
  const handleEditShift = (shift) => {
    setCurrentShift(shift);
    setNewShiftDate(shift.date);
    setNewShiftTime(shift.time);
    setNewShiftCapacity(shift.capacity);
    setShowEditShiftModal(true);
  };

  // Manejador para actualizar un turno existente
  const handleUpdateShift = async () => {
    if (
      !currentShift ||
      !newShiftDate ||
      !newShiftTime ||
      newShiftCapacity <= 0
    ) {
      showMessage(
        "Por favor, completa todos los campos para actualizar el turno.",
        "error"
      );
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const shiftRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/shifts`,
        currentShift.id
      );
      await updateDoc(shiftRef, {
        date: newShiftDate,
        time: newShiftTime,
        capacity: Number(newShiftCapacity),
      });
      showMessage("Turno actualizado exitosamente.", "success");
      setShowEditShiftModal(false); // Cierra el modal
      // Resetea los estados
      setCurrentShift(null);
      setNewShiftDate("");
      setNewShiftTime("");
      setNewShiftCapacity(10);
    } catch (e) {
      console.error("Error al actualizar turno:", e);
      showMessage("Error al actualizar turno.", "error");
    }
  };

  // Prepara el modal de confirmación para eliminar un turno
  const handleDeleteShiftClick = (shiftId) => {
    setShiftToDelete(shiftId);
    setShowConfirmDeleteShiftModal(true);
  };

  // Manejador para eliminar un turno después de la confirmación
  const confirmDeleteShift = async () => {
    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${userId}/shifts`, shiftToDelete)
      );
      showMessage("Turno eliminado exitosamente.", "success");
    } catch (e) {
      console.error("Error al eliminar turno:", e);
      showMessage("Error al eliminar turno.", "error");
    } finally {
      setShowConfirmDeleteShiftModal(false); // Cierra el modal de confirmación
      setShiftToDelete(null); // Resetea el ID del turno a eliminar
    }
  };

  // Manejador para reservar un cliente en un turno
  const handleBookClient = async (shiftId) => {
    if (!selectedClientForBooking) {
      showMessage("Por favor, selecciona un cliente para reservar.", "error");
      return;
    }

    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const currentBookedClients = shift.bookedClients || [];
    if (currentBookedClients.includes(selectedClientForBooking)) {
      showMessage("Este cliente ya está reservado para este turno.", "error");
      return;
    }
    if (currentBookedClients.length >= shift.capacity) {
      showMessage(
        "El turno está lleno. No se pueden añadir más clientes.",
        "error"
      );
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const shiftRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/shifts`,
        shiftId
      );
      await updateDoc(shiftRef, {
        bookedClients: [...currentBookedClients, selectedClientForBooking], // Añade el nuevo cliente
      });
      showMessage("Cliente reservado exitosamente.", "success");
      setSelectedClientForBooking(""); // Resetea la selección del cliente
    } catch (e) {
      console.error("Error al reservar cliente:", e);
      showMessage("Error al reservar cliente.", "error");
    }
  };

  // Manejador para eliminar un cliente de un turno
  const handleRemoveClientFromShift = async (shiftId, clientIdToRemove) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    // Filtra el cliente a eliminar de la lista de clientes reservados
    const updatedBookedClients = (shift.bookedClients || []).filter(
      (id) => id !== clientIdToRemove
    );

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const shiftRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/shifts`,
        shiftId
      );
      await updateDoc(shiftRef, {
        bookedClients: updatedBookedClients,
      });
      showMessage("Cliente eliminado del turno exitosamente.", "success");
    } catch (e) {
      console.error("Error al eliminar cliente del turno:", e);
      showMessage("Error al eliminar cliente del turno.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Gestión de Turnos
      </h2>

      {/* Botón para agregar nuevo turno */}
      <button
        onClick={() => setShowAddShiftModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center mx-auto"
      >
        <i className="fas fa-plus-circle mr-2"></i> Agregar Nuevo Turno
      </button>

      {/* Mensaje de estado (éxito/error) */}
      {message && (
        <div
          className={`p-4 rounded-lg text-center font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Lista de Turnos */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Lista de Turnos
        </h3>
        {shifts.length === 0 ? (
          <p className="text-gray-600">
            No hay turnos registrados. ¡Agrega uno!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Fecha
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Hora
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Capacidad
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Reservados
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Clientes
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr
                    key={shift.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-800">{shift.date}</td>
                    <td className="py-3 px-4 text-gray-800">{shift.time}</td>
                    <td className="py-3 px-4 text-gray-800">
                      {shift.capacity}
                    </td>
                    <td className="py-3 px-4 text-gray-800">
                      {shift.bookedClients ? shift.bookedClients.length : 0}
                    </td>
                    <td className="py-3 px-4 text-gray-800">
                      {shift.bookedClients && shift.bookedClients.length > 0 ? (
                        <ul className="list-disc list-inside text-sm">
                          {shift.bookedClients.map((clientId) => {
                            const client = clients.find(
                              (c) => c.id === clientId
                            );
                            return (
                              <li
                                key={clientId}
                                className="flex items-center justify-between"
                              >
                                {client ? client.name : "Cliente desconocido"}
                                <button
                                  onClick={() =>
                                    handleRemoveClientFromShift(
                                      shift.id,
                                      clientId
                                    )
                                  }
                                  className="ml-2 text-red-500 hover:text-red-700 text-xs"
                                  title="Eliminar cliente del turno"
                                >
                                  <i className="fas fa-times-circle"></i>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="text-gray-500 text-sm">Ninguno</span>
                      )}
                      <div className="mt-2">
                        <select
                          className="block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          value={selectedClientForBooking}
                          onChange={(e) =>
                            setSelectedClientForBooking(e.target.value)
                          }
                        >
                          <option value="">Seleccionar cliente</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleBookClient(shift.id)}
                          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-3 rounded-md shadow-sm"
                        >
                          Reservar
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditShift(shift)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full shadow-md text-sm"
                          title="Editar Turno"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteShiftClick(shift.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md text-sm"
                          title="Eliminar Turno"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para agregar turno */}
      {showAddShiftModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Agregar Nuevo Turno
            </h3>
            <div className="mb-4">
              <label
                htmlFor="shiftDate"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Fecha:
              </label>
              <input
                type="date"
                id="shiftDate"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftDate}
                onChange={(e) => setNewShiftDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="shiftTime"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Hora:
              </label>
              <input
                type="time"
                id="shiftTime"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftTime}
                onChange={(e) => setNewShiftTime(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="shiftCapacity"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Capacidad:
              </label>
              <input
                type="number"
                id="shiftCapacity"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftCapacity}
                onChange={(e) => setNewShiftCapacity(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAddShiftModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddShift}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Guardar Turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar turno */}
      {showEditShiftModal && currentShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Editar Turno
            </h3>
            <div className="mb-4">
              <label
                htmlFor="editShiftDate"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Fecha:
              </label>
              <input
                type="date"
                id="editShiftDate"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftDate}
                onChange={(e) => setNewShiftDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="editShiftTime"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Hora:
              </label>
              <input
                type="time"
                id="editShiftTime"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftTime}
                onChange={(e) => setNewShiftTime(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="editShiftCapacity"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Capacidad:
              </label>
              <input
                type="number"
                id="editShiftCapacity"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newShiftCapacity}
                onChange={(e) => setNewShiftCapacity(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowEditShiftModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateShift}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Actualizar Turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para eliminar turno */}
      <ConfirmModal
        show={showConfirmDeleteShiftModal}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que quieres eliminar este turno? Esta acción no se puede deshacer."
        onConfirm={confirmDeleteShift}
        onCancel={() => setShowConfirmDeleteShiftModal(false)}
      />
    </div>
  );
}

// Componente Clients: Gestiona la información de los clientes
function Clients() {
  const { db, userId } = useFirebase();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]); // Necesario para verificar el estado de pago
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showConfirmDeleteClientModal, setShowConfirmDeleteClientModal] =
    useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);

  useEffect(() => {
    if (!db || !userId) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const clientsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/clients`
    );
    const paymentsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/payments`
    );

    // Suscripción en tiempo real a los clientes
    const unsubscribeClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      },
      (err) => {
        console.error("Error al obtener clientes:", err);
        showMessage("Error al cargar clientes.", "error");
      }
    );

    // Suscripción en tiempo real a los pagos
    const unsubscribePayments = onSnapshot(
      paymentsRef,
      (snapshot) => {
        const paymentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPayments(paymentsData);
      },
      (err) => {
        console.error("Error al obtener pagos:", err);
        showMessage("Error al cargar pagos para verificar estado.", "error");
      }
    );

    return () => {
      unsubscribeClients();
      unsubscribePayments();
    };
  }, [db, userId]);

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  // Función para obtener el estado de pago de un cliente
  const getPaymentStatus = (clientId) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // getMonth() es 0-indexado
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();

    // Buscar un pago para el cliente en el mes y año actual
    const hasPaidThisMonth = payments.some(
      (payment) =>
        payment.clientId === clientId &&
        payment.paymentMonth === currentMonth &&
        payment.paymentYear === currentYear
    );

    if (hasPaidThisMonth) {
      return {
        status: "Al día",
        color: "text-green-600",
        bgColor: "bg-green-100",
      };
    } else {
      // Si es después del día 10 y no ha pagado, está vencido
      if (dayOfMonth > 10) {
        return {
          status: "Vencido",
          color: "text-red-600",
          bgColor: "bg-red-100",
        };
      } else {
        // Si es el día 10 o antes y no ha pagado, está pendiente
        return {
          status: "Pendiente",
          color: "text-yellow-600",
          bgColor: "bg-yellow-100",
        };
      }
    }
  };

  // Manejador para agregar un nuevo cliente
  const handleAddClient = async () => {
    if (!newClientName) {
      showMessage("El nombre del cliente es obligatorio.", "error");
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/clients`),
        {
          name: newClientName,
          phone: newClientPhone,
          email: newClientEmail,
          createdAt: serverTimestamp(),
          gymId: appId,
          userId: userId,
        }
      );
      showMessage("Cliente agregado exitosamente.", "success");
      setShowAddClientModal(false);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
    } catch (e) {
      console.error("Error al agregar cliente:", e);
      showMessage("Error al agregar cliente.", "error");
    }
  };

  // Prepara el modal de edición con los datos del cliente seleccionado
  const handleEditClient = (client) => {
    setCurrentClient(client);
    setNewClientName(client.name);
    setNewClientPhone(client.phone || "");
    setNewClientEmail(client.email || "");
    setShowEditClientModal(true);
  };

  // Manejador para actualizar un cliente existente
  const handleUpdateClient = async () => {
    if (!currentClient || !newClientName) {
      showMessage("El nombre del cliente es obligatorio.", "error");
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      const clientRef = doc(
        db,
        `artifacts/${appId}/users/${userId}/clients`,
        currentClient.id
      );
      await updateDoc(clientRef, {
        name: newClientName,
        phone: newClientPhone,
        email: newClientEmail,
      });
      showMessage("Cliente actualizado exitosamente.", "success");
      setShowEditClientModal(false);
      setCurrentClient(null);
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
    } catch (e) {
      console.error("Error al actualizar cliente:", e);
      showMessage("Error al actualizar cliente.", "error");
    }
  };

  // Prepara el modal de confirmación para eliminar un cliente
  const handleDeleteClientClick = (clientId) => {
    setClientToDelete(clientId);
    setShowConfirmDeleteClientModal(true);
  };

  // Manejador para eliminar un cliente después de la confirmación
  const confirmDeleteClient = async () => {
    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      // Eliminar el cliente
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${userId}/clients`, clientToDelete)
      );

      // Eliminar pagos asociados al cliente
      const paymentsQuery = query(
        collection(db, `artifacts/${appId}/users/${userId}/payments`),
        where("clientId", "==", clientToDelete)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      paymentsSnapshot.forEach(async (paymentDoc) => {
        await deleteDoc(
          doc(db, `artifacts/${appId}/users/${userId}/payments`, paymentDoc.id)
        );
      });

      // Eliminar el cliente de cualquier turno reservado
      const shiftsQuery = query(
        collection(db, `artifacts/${appId}/users/${userId}/shifts`),
        where("bookedClients", "array-contains", clientToDelete)
      );
      const shiftsSnapshot = await getDocs(shiftsQuery);
      shiftsSnapshot.forEach(async (shiftDoc) => {
        const shiftData = shiftDoc.data();
        const updatedBookedClients = (shiftData.bookedClients || []).filter(
          (id) => id !== clientToDelete
        );
        await updateDoc(
          doc(db, `artifacts/${appId}/users/${userId}/shifts`, shiftDoc.id),
          {
            bookedClients: updatedBookedClients,
          }
        );
      });

      showMessage(
        "Cliente y sus datos asociados eliminados exitosamente.",
        "success"
      );
    } catch (e) {
      console.error("Error al eliminar cliente:", e);
      showMessage("Error al eliminar cliente.", "error");
    } finally {
      setShowConfirmDeleteClientModal(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Gestión de Clientes
      </h2>

      {/* Botón para agregar nuevo cliente */}
      <button
        onClick={() => setShowAddClientModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center mx-auto"
      >
        <i className="fas fa-user-plus mr-2"></i> Agregar Nuevo Cliente
      </button>

      {/* Mensaje de estado */}
      {message && (
        <div
          className={`p-4 rounded-lg text-center font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Lista de Clientes */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Lista de Clientes
        </h3>
        {clients.length === 0 ? (
          <p className="text-gray-600">
            No hay clientes registrados. ¡Agrega uno!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Nombre
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Teléfono
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Email
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Mensualidad
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const paymentStatus = getPaymentStatus(client.id);
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-gray-800">{client.name}</td>
                      <td className="py-3 px-4 text-gray-800">
                        {client.phone || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-800">
                        {client.email || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatus.bgColor} ${paymentStatus.color}`}
                        >
                          {paymentStatus.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClient(client)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full shadow-md text-sm"
                            title="Editar Cliente"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteClientClick(client.id)}
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md text-sm"
                            title="Eliminar Cliente"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para agregar cliente */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Agregar Nuevo Cliente
            </h3>
            <div className="mb-4">
              <label
                htmlFor="clientName"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Nombre:
              </label>
              <input
                type="text"
                id="clientName"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="clientPhone"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Teléfono (opcional):
              </label>
              <input
                type="text"
                id="clientPhone"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Número de teléfono"
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="clientEmail"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Email (opcional):
              </label>
              <input
                type="email"
                id="clientEmail"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Correo electrónico"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAddClientModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddClient}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar cliente */}
      {showEditClientModal && currentClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Editar Cliente
            </h3>
            <div className="mb-4">
              <label
                htmlFor="editClientName"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Nombre:
              </label>
              <input
                type="text"
                id="editClientName"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="editClientPhone"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Teléfono (opcional):
              </label>
              <input
                type="text"
                id="editClientPhone"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="editClientEmail"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Email (opcional):
              </label>
              <input
                type="email"
                id="editClientEmail"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowEditClientModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateClient}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Actualizar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para eliminar cliente */}
      <ConfirmModal
        show={showConfirmDeleteClientModal}
        title="Confirmar Eliminación de Cliente"
        message="¿Estás seguro de que quieres eliminar este cliente? Esto también eliminará sus pagos asociados y lo quitará de cualquier turno reservado."
        onConfirm={confirmDeleteClient}
        onCancel={() => setShowConfirmDeleteClientModal(false)}
      />
    </div>
  );
}

// Componente Payments: Gestiona el registro y visualización de pagos
function Payments() {
  const { db, userId } = useFirebase();
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]); // Lista de clientes para seleccionar al registrar un pago
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPaymentClientId, setNewPaymentClientId] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMonth, setNewPaymentMonth] = useState(
    new Date().getMonth() + 1
  ); // Mes actual por defecto
  const [newPaymentYear, setNewPaymentYear] = useState(
    new Date().getFullYear()
  ); // Año actual por defecto
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showConfirmDeletePaymentModal, setShowConfirmDeletePaymentModal] =
    useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  useEffect(() => {
    if (!db || !userId) return;

    const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";
    const paymentsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/payments`
    );
    const clientsRef = collection(
      db,
      `artifacts/${appId}/users/${userId}/clients`
    );

    // Suscripción en tiempo real a los pagos
    const unsubscribePayments = onSnapshot(
      paymentsRef,
      (snapshot) => {
        const paymentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Ordena los pagos por fecha de registro descendente
        setPayments(
          paymentsData.sort(
            (a, b) => (b.date?.toDate() || 0) - (a.date?.toDate() || 0)
          )
        );
      },
      (err) => {
        console.error("Error al obtener pagos:", err);
        showMessage("Error al cargar pagos.", "error");
      }
    );

    // Suscripción en tiempo real a los clientes (para el selector de cliente en pagos)
    const unsubscribeClients = onSnapshot(
      clientsRef,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
      },
      (err) => {
        console.error("Error al obtener clientes:", err);
        showMessage("Error al cargar clientes para pagos.", "error");
      }
    );

    return () => {
      unsubscribePayments();
      unsubscribeClients();
    };
  }, [db, userId]);

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  // Manejador para agregar un nuevo pago
  const handleAddPayment = async () => {
    if (
      !newPaymentClientId ||
      !newPaymentAmount ||
      isNaN(parseFloat(newPaymentAmount)) ||
      parseFloat(newPaymentAmount) <= 0
    ) {
      showMessage(
        "Por favor, selecciona un cliente y un monto válido para el pago.",
        "error"
      );
      return;
    }
    if (!newPaymentMonth || !newPaymentYear) {
      showMessage(
        "Por favor, selecciona el mes y año de la mensualidad.",
        "error"
      );
      return;
    }

    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      await addDoc(
        collection(db, `artifacts/${appId}/users/${userId}/payments`),
        {
          clientId: newPaymentClientId,
          amount: parseFloat(newPaymentAmount),
          date: serverTimestamp(), // Marca de tiempo del registro del pago
          paymentMonth: Number(newPaymentMonth), // Mes al que corresponde el pago
          paymentYear: Number(newPaymentYear), // Año al que corresponde el pago
          gymId: appId,
          userId: userId,
        }
      );
      showMessage("Pago registrado exitosamente.", "success");
      setShowAddPaymentModal(false);
      setNewPaymentClientId("");
      setNewPaymentAmount("");
      setNewPaymentMonth(new Date().getMonth() + 1); // Restablecer al mes actual
      setNewPaymentYear(new Date().getFullYear()); // Restablecer al año actual
    } catch (e) {
      console.error("Error al agregar pago:", e);
      showMessage("Error al registrar pago.", "error");
    }
  };

  // Prepara el modal de confirmación para eliminar un pago
  const handleDeletePaymentClick = (paymentId) => {
    setPaymentToDelete(paymentId);
    setShowConfirmDeletePaymentModal(true);
  };

  // Manejador para eliminar un pago después de la confirmación
  const confirmDeletePayment = async () => {
    try {
      const appId =
        typeof __app_id !== "undefined" ? __app_id : "default-app-id";
      await deleteDoc(
        doc(db, `artifacts/${appId}/users/${userId}/payments`, paymentToDelete)
      );
      showMessage("Pago eliminado exitosamente.", "success");
    } catch (e) {
      console.error("Error al eliminar pago:", e);
      showMessage("Error al eliminar pago.", "error");
    } finally {
      setShowConfirmDeletePaymentModal(false);
      setPaymentToDelete(null);
    }
  };

  // Función auxiliar para obtener el nombre del cliente a partir de su ID
  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : "Cliente desconocido";
  };

  // Nombres de los meses para el selector
  const monthNames = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Gestión de Pagos
      </h2>

      {/* Botón para registrar nuevo pago */}
      <button
        onClick={() => setShowAddPaymentModal(true)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center mx-auto"
      >
        <i className="fas fa-plus-circle mr-2"></i> Registrar Nuevo Pago
      </button>

      {/* Mensaje de estado */}
      {message && (
        <div
          className={`p-4 rounded-lg text-center font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Historial de Pagos */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">
          Historial de Pagos
        </h3>
        {payments.length === 0 ? (
          <p className="text-gray-600">
            No hay pagos registrados. ¡Registra uno!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden">
              <thead className="bg-gray-200">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Cliente
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Monto
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Mensualidad
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Fecha Registro
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-gray-800">
                      {getClientName(payment.clientId)}
                    </td>
                    <td className="py-3 px-4 text-gray-800">
                      ${payment.amount ? payment.amount.toFixed(2) : "0.00"}
                    </td>
                    <td className="py-3 px-4 text-gray-800">
                      {payment.paymentMonth && payment.paymentYear
                        ? `${monthNames[payment.paymentMonth - 1]} ${
                            payment.paymentYear
                          }`
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-gray-800">
                      {payment.date
                        ? new Date(payment.date.toDate()).toLocaleDateString(
                            "es-ES"
                          )
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDeletePaymentClick(payment.id)}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md text-sm"
                        title="Eliminar Pago"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para registrar pago */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              Registrar Nuevo Pago
            </h3>
            <div className="mb-4">
              <label
                htmlFor="paymentClient"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Cliente:
              </label>
              <select
                id="paymentClient"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPaymentClientId}
                onChange={(e) => setNewPaymentClientId(e.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label
                htmlFor="paymentMonth"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Mes de la Mensualidad:
              </label>
              <select
                id="paymentMonth"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPaymentMonth}
                onChange={(e) => setNewPaymentMonth(e.target.value)}
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label
                htmlFor="paymentYear"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Año de la Mensualidad:
              </label>
              <input
                type="number"
                id="paymentYear"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPaymentYear}
                onChange={(e) => setNewPaymentYear(e.target.value)}
                min="2000" // Puedes ajustar el rango de años
                max="2100"
              />
            </div>
            <div className="mb-6">
              <label
                htmlFor="paymentAmount"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Monto:
              </label>
              <input
                type="number"
                id="paymentAmount"
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newPaymentAmount}
                onChange={(e) => setNewPaymentAmount(e.target.value)}
                placeholder="Monto del pago"
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPayment}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
              >
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para eliminar pago */}
      <ConfirmModal
        show={showConfirmDeletePaymentModal}
        title="Confirmar Eliminación de Pago"
        message="¿Estás seguro de que quieres eliminar este pago? Esta acción no se puede deshacer."
        onConfirm={confirmDeletePayment}
        onCancel={() => setShowConfirmDeletePaymentModal(false)}
      />
    </div>
  );
}

export default App;
