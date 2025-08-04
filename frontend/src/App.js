import React, { useState, useEffect } from 'react';
import './App.css';
import './js/app-logic';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  
  useEffect(() => {
    // Initialize the app with vanilla JavaScript
    window.AppLogic.init();
    
    // Listen for navigation changes
    const handleNavigation = (event) => {
      setCurrentView(event.detail.view);
    };
    
    window.addEventListener('navigate', handleNavigation);
    
    return () => {
      window.removeEventListener('navigate', handleNavigation);
    };
  }, []);

  return (
    <div className="App">
      {/* App content is managed by vanilla JavaScript */}
      <div id="app-container"></div>
    </div>
  );
}

export default App;