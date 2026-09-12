import { store } from '../state/store.js';

export function renderOtpLoginModal() {
  const isOpen = store.loginModalOpen;
  if (!isOpen) return '';

  return `
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl my-auto bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-surface-container-high">
        <!-- Modal Header -->
        <div className="p-6 bg-surface-container-low flex items-start justify-between gap-4 border-b border-surface-container-high">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-primary text-[28px]">local_fire_department</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-headline-sm text-primary tracking-tight">આજે શું?</span>
                <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-label-sm uppercase font-bold">Bhavnagar</span>
              </div>
              <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight mt-0.5">
                Continue with Phone <span className="text-primary font-semibold text-body-md block sm:inline">(ફોન નંબરથી લોગિન કરો)</span>
              </h1>
            </div>
          </div>
          <button id="close-otp-modal-btn" className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Subtitle & Sandbox Notice */}
        <div className="px-6 pt-4 pb-0">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Quick 1-tap OTP to save events, book seats, and receive WhatsApp reminders. No passwords needed.
          </p>
          <div className="mt-3 p-3 rounded-xl bg-tertiary-fixed/30 flex items-start gap-2 border border-tertiary-fixed/40">
            <span className="material-symbols-outlined text-tertiary text-[18px] shrink-0 mt-0.5">science</span>
            <div className="font-label-md text-label-md text-on-tertiary-fixed-variant leading-tight">
              <strong className="font-extrabold text-tertiary uppercase">Demo Sandbox Active:</strong> Enter <span className="font-mono bg-surface-container-lowest px-1.5 py-0.5 rounded font-bold text-primary">123456</span> or <span className="font-mono bg-surface-container-lowest px-1.5 py-0.5 rounded font-bold text-primary">1111</span> to instantly continue.
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-label-md text-label-md font-bold text-on-surface">Mobile Number (મોબાઇલ નંબર)</label>
              <span className="font-label-sm text-label-sm text-on-surface-variant">Saurashtra Circle (+91)</span>
            </div>
            <div className="flex items-center rounded-xl bg-surface-container p-1 shadow-inner focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_2px_rgba(173,44,0,0.4)] transition-all">
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface shrink-0 shadow-sm">
                <span className="text-[18px] leading-none">🇮🇳</span>
                <span className="font-label-lg text-label-lg font-bold">+91</span>
              </div>
              <input
                id="otp-phone-input"
                type="tel"
                value="98795 43210"
                className="w-full bg-transparent px-3 py-1.5 font-headline-sm text-headline-sm font-bold text-on-surface focus:outline-none tracking-wider placeholder:text-on-surface-variant/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-md text-label-md font-bold text-on-surface">6-Digit OTP Verification</span>
              </div>
              <span className="font-label-md text-label-md text-primary font-bold">Resend in 0:24s</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <input type="text" maxLength="1" defaultValue="1" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
              <input type="text" maxLength="1" defaultValue="2" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
              <input type="text" maxLength="1" defaultValue="3" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
              <input type="text" maxLength="1" defaultValue="4" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
              <input type="text" maxLength="1" defaultValue="5" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
              <input type="text" maxLength="1" defaultValue="6" className="otp-digit-box w-full aspect-square text-center font-headline-md text-headline-md font-extrabold text-primary bg-surface-container-low rounded-xl focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none transition-all" />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              id="verify-otp-btn"
              className="w-full py-3 rounded-full bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(173,44,0,0.3)] active:scale-[0.98] transition-all"
            >
              <span>Verify & Continue (આગળ વધો)</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>

          {/* Unlocked Features Banner */}
          <div className="rounded-xl bg-surface-container-low p-4 space-y-2 border border-surface-container-high">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-extrabold text-tertiary">Unlocked With Your Account</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">1-click free sync</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm flex items-start gap-2">
                <span className="text-primary text-[18px] leading-none shrink-0 mt-0.5">❤️</span>
                <div>
                  <div className="font-label-md text-label-md font-bold text-on-surface leading-snug">Save Plans</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant leading-tight">Cross-device list</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm flex items-start gap-2">
                <span className="text-primary text-[18px] leading-none shrink-0 mt-0.5">📲</span>
                <div>
                  <div className="font-label-md text-label-md font-bold text-on-surface leading-snug">WhatsApp Pass</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant leading-tight">Natak & Sabha</div>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-surface-container-lowest shadow-sm flex items-start gap-2">
                <span className="text-primary text-[18px] leading-none shrink-0 mt-0.5">🔔</span>
                <div>
                  <div className="font-label-md text-label-md font-bold text-on-surface leading-snug">Radar Alerts</div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant leading-tight">Waghawadi updates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function bindOtpLoginModalEvents(container) {
  const closeBtn = container.querySelector('#close-otp-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      store.setLoginModalOpen(false);
    });
  }

  const verifyBtn = container.querySelector('#verify-otp-btn');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
      store.setUserAuthenticated(true);
      store.setLoginModalOpen(false);
      alert('Welcome to Aaje Su? Bhavnagar! Login successful.');
    });
  }
}
