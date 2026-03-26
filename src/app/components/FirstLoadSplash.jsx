import BrandMark from "../../shared/components/BrandMark.jsx";

export default function FirstLoadSplash() {
  return (
    <div className="first-load-splash" role="status" aria-live="polite">
      <div className="first-load-splash__orb" />
      <div className="first-load-splash__card">
        <div className="first-load-splash__logo-wrap">
          <BrandMark size={44} />
        </div>
        <p className="first-load-splash__title">Ticket support</p>
        <p className="first-load-splash__subtitle">Cargando espacio de trabajo...</p>
        <div className="first-load-splash__bar">
          <span />
        </div>
      </div>
    </div>
  );
}
