import React, { useState, useEffect } from "react";

export function UnifiedSubnav({ tabs, activeTab, onSelectTab }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Trigger compact sticky state when scrolled down
      setIsScrolled(window.scrollY > 25);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className={`unified-subnav-wrapper ${isScrolled ? "is-scrolled" : ""}`}>
      <div className={`export-tabs-bar ${isScrolled ? "is-compact" : ""}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`export-tab-btn ${activeTab === t.id ? "active" : ""}`}
            onClick={() => onSelectTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
