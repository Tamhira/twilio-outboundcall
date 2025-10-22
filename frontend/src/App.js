// App.js
import { useState } from 'react';
import { Phone, History, Moon, Sun, Sparkles, Zap, Shield, PhoneCall, Activity } from 'lucide-react';
import './App.css';

export default function OutboundApp() {
  const [toNumber, setToNumber] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Ready to connect. Enter a number to begin.');
  const [darkMode, setDarkMode] = useState(false);
  const TWILIO_FROM_NUMBER = '+13806668172';

  const startCall = async () => {
    if (!toNumber) {
      setMessage('Please enter a destination number.');
      return;
    }

    setStatus('calling');
    setMessage('Calling...');
    try {
      const res = await fetch('http://localhost:5000/makeCall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toNumber, from: TWILIO_FROM_NUMBER }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Call initiated! The customer will hear the feedback questions.');
        setStatus('done');
      } else {
        setMessage('✗ Error: ' + data.error);
        setStatus('idle');
      }
    } catch (err) {
      console.error(err);
      setMessage('✗ Error initiating call. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div className={darkMode ? 'dark' : 'light'}>
      {/* Background Orbs */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>

      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">
              <Sparkles size={24} color="white" strokeWidth={2.5} />
            </div>
            <span className="logo-text">VoiceAI</span>
          </div>
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* Main Content */}
        <div className="main-content">
          {/* Hero Section */}
          <div className="hero">
            <div className="hero-badge">
              <Zap size={16} />
              <span>AI-Powered Feedback System</span>
            </div>
            <h1>Automated Feedback<br />Dialer Platform</h1>
            <p>Transform customer engagement with intelligent voice automation. Deploy feedback campaigns instantly.</p>
          </div>

          {/* Glass Card */}
          <div className="glass-card">
            {/* <div className="icon-circle">
              <Phone size={36} color="white" strokeWidth={2.5} />
            </div> */}

            <div className="input-group">
              {/* <label className="input-label">Destination Number</label> */}
              <input
                type="text"
                className="input-field"
                placeholder="+1 (555) 123-4567"
                value={toNumber}
                onChange={(e) => setToNumber(e.target.value)}
              />
            </div>

            <button
              className="call-button"
              onClick={startCall}
              disabled={status === 'calling'}
            >
              <PhoneCall size={20} />
              <span>Initiate Call</span>
            </button>

            <div className={`status-message ${!message ? 'empty' : ''}`}>
              {message}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}