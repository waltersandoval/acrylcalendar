/**
 * Componente: PayPalButton
 * Dominio: public / payments
 *
 * Renderiza los botones oficiales de PayPal cargando el SDK dinámicamente.
 * Admite parámetros de diseño (color, forma) y localización (país de facturación).
 */
import React, { useEffect, useRef, useState } from 'react';

interface PayPalButtonProps {
  clientId?: string;
  amount: string;
  currency: string;
  description: string;
  onApprove: (orderId: string) => void;
  onError?: (err: any) => void;
  disabled?: boolean;
  color?: string;
  shape?: string;
  buyerCountry?: string;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

// ─────────────────────────────────────────────────────────────
// Carga dinámica del SDK de PayPal JS con caché
// ─────────────────────────────────────────────────────────────
const sdkPromises: Record<string, Promise<void>> = {};

function loadPayPalSDK(clientId: string, currency: string, buyerCountry?: string): Promise<void> {
  const key = `${clientId}_${currency}_${buyerCountry || 'default'}`;
  if (sdkPromises[key]) return sdkPromises[key];

  sdkPromises[key] = new Promise((resolve, reject) => {
    if (window.paypal) {
      const existingScript = document.querySelector(`script[src*="client-id=${clientId}"]`);
      if (existingScript) {
        resolve();
        return;
      }
      delete window.paypal;
      const oldScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (oldScript) {
        oldScript.remove();
      }
    }

    const script = document.createElement('script');
    let src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture&locale=es_ES`;
    if (buyerCountry) {
      src += `&buyer-country=${buyerCountry}`;
    }
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload  = () => resolve();
    script.onerror = () => {
      delete sdkPromises[key];
      reject(new Error('No se pudo cargar el SDK de PayPal.'));
    };
    document.body.appendChild(script);
  });

  return sdkPromises[key];
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
const PayPalButton: React.FC<PayPalButtonProps> = ({
  clientId,
  amount,
  currency,
  description,
  onApprove,
  onError,
  disabled = false,
  color = 'gold',
  shape = 'rect',
  buyerCountry = 'HN',
}) => {
  const containerRef    = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady]    = useState(false);
  const [sdkError, setSdkError]    = useState<string | null>(null);
  const [rendered, setRendered]    = useState(false);
  const [processing, setProcessing] = useState(false);

  const staticClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined;
  const effectiveClientId = clientId || staticClientId;

  // Cargar SDK al montar o cambiar effectiveClientId, currency o buyerCountry
  useEffect(() => {
    if (!effectiveClientId || effectiveClientId === 'REEMPLAZAR_paypal_client_id') {
      setSdkError('PayPal Client ID no configurado.');
      return;
    }

    loadPayPalSDK(effectiveClientId, currency.toUpperCase(), buyerCountry)
      .then(() => setSdkReady(true))
      .catch((err) => setSdkError(err.message));
  }, [effectiveClientId, currency, buyerCountry]);

  // Renderizar botones una vez que el SDK esté listo
  useEffect(() => {
    if (!sdkReady || !containerRef.current || rendered || disabled) return;

    // Limpiar el contenedor antes de renderizar
    containerRef.current.innerHTML = '';
    setRendered(false);

    try {
      window.paypal
        .Buttons({
          style: {
            layout:  'vertical',
            color:   color,
            shape:   shape,
            label:   'pay',
            height:  48,
          },

          // Crear la orden en el cliente (el servidor verificará el monto)
          createOrder: (_data: any, actions: any) => {
            return actions.order.create({
              intent: 'CAPTURE',
              purchase_units: [
                {
                  description: description || 'Reserva de cita',
                  amount: {
                    currency_code: currency.toUpperCase(),
                    value: parseFloat(amount).toFixed(2),
                  },
                },
              ],
              application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                brand_name: 'Reservar Cita',
                locale: 'es-ES',
              },
            });
          },

          // Capturar el pago después de la aprobación del usuario
          onApprove: async (data: any, actions: any) => {
            setProcessing(true);
            try {
              // Capturar la orden (importante para completar el pago)
              await actions.order.capture();
              // Pasar el orderId al padre para verificación server-side
              onApprove(data.orderID);
            } catch (err) {
              console.error('[PayPal] Error capturando orden:', err);
              if (onError) onError(err);
            }
          },

          onError: (err: any) => {
            console.error('[PayPal] Error en botones:', err);
            setProcessing(false);
            if (onError) onError(err);
          },

          onCancel: () => {
            setProcessing(false);
          },
        })
        .render(containerRef.current)
        .then(() => setRendered(true))
        .catch((err: any) => {
          console.error('[PayPal] Error renderizando botones:', err);
          setSdkError('No se pudieron cargar los botones de PayPal.');
        });
    } catch (err: any) {
      setSdkError(err?.message || 'Error inicializando PayPal.');
    }
  }, [sdkReady, disabled, amount, currency, description, color, shape]);

  // ── Estados de error ──────────────────────────────────────
  if (sdkError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
        <p className="text-sm font-semibold text-red-700">⚠️ {sdkError}</p>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (!sdkReady) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="w-full h-12 rounded-xl bg-amber-100 animate-pulse" />
        <div className="w-2/3 h-10 rounded-xl srf-sunken animate-pulse" />
        <p className="text-xs ink-3 font-semibold animate-pulse">Cargando PayPal...</p>
      </div>
    );
  }

  // ── Procesando pago ───────────────────────────────────────
  return (
    <div className="relative">
      {processing && (
        <div className="absolute inset-0 z-20 srf-panel backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold ink-1">Verificando pago...</p>
        </div>
      )}
      {/* Contenedor donde PayPal inyecta sus botones */}
      <div
        ref={containerRef}
        id="paypal-button-container"
        className={`min-h-[100px] ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      />
    </div>
  );
};

export default PayPalButton;
