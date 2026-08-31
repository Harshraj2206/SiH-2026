import React, { useState } from 'react';
import { systemApi } from '../services/api';
import { useEmergency } from '../context/EmergencyContext';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  CloudRain, 
  Bell, 
  Users, 
  ShieldAlert, 
  Ban, 
  Navigation, 
  Radio, 
  Shield, 
  Ambulance, 
  FileCheck, 
  ArrowRight,
  Zap
} from 'lucide-react';

const SIMULATION_STEPS = [
  { step: 1, title: 'Step 1: Heavy Monsoon Infiltration', desc: 'Rainfall increases across Ri-Bhoi (85mm -> 105mm). AI base risk escalates.', icon: CloudRain, color: 'text-cyan-400' },
  { step: 2, title: 'Step 2: Automated Warning Generated', desc: 'System triggers HIGH ADVISORY alert for NH-6 Nongpoh corridor.', icon: Bell, color: 'text-amber-400' },
  { step: 3, title: 'Step 3: Citizen Ground Observations Arrive', desc: '3 field reports of tarmac cracks and muddy water seepage submitted via mobile PWA.', icon: Users, color: 'text-blue-400' },
  { step: 4, title: 'Step 4: AI + Human Ground Truth Fusion', desc: 'Authorities verify reports. Community Boost (+15 pts) elevates risk to CRITICAL (83/100).', icon: Sparkles, color: 'text-rose-400' },
  { step: 5, title: 'Step 5: Road Blockage on Highway NH-6', desc: '40-meter mudflow collapse blocks NH-6 Umsning Hill Pass.', icon: Ban, color: 'text-red-500' },
  { step: 6, title: 'Step 6: Normal Direct Highway Unsafe', desc: 'Shortest route assessed as hazardous and impassable.', icon: ShieldAlert, color: 'text-orange-400' },
  { step: 7, title: 'Step 7: AI Safe Route Engine Recalculates', desc: 'Dijkstra engine diverts civilian convoys via Mawhati-Bhoirymbong Eastern Valley Bypass.', icon: Navigation, color: 'text-emerald-400' },
  { step: 8, title: 'Step 8: Emergency SOS Distress Beacon Arrives', desc: 'Vehicle trapped near KM 49 with 4 occupants and injuries. Triaged as CRITICAL.', icon: Radio, color: 'text-red-400' },
  { step: 9, title: 'Step 9: Multi-Agency Rescue Dispatch', desc: 'SDRF Ri-Bhoi Fast Response Unit and 108 Mobile ICU dispatched to site.', icon: Shield, color: 'text-indigo-400' },
  { step: 10, title: 'Step 10: Hospital & Shelter Allocation', desc: 'Direct safe ambulance routing to Civil Hospital Nongpoh Trauma Center & Relief Camp.', icon: Ambulance, color: 'text-sky-400' },
  { step: 11, title: 'Step 11: Rescue Extraction & Road Cleared', desc: 'All 4 victims safely extracted and transported. Incident marked RESOLVED.', icon: CheckCircle2, color: 'text-emerald-400' },
  { step: 12, title: 'Step 12: Post-Disaster Audit & Model Calibration', desc: 'Response timeline recorded and Random Forest feature weights calibrated for future warnings.', icon: FileCheck, color: 'text-purple-400' }
];

export const SimulatorPage = () => {
  const { refreshData } = useEmergency();
  const [currentStep, setCurrentStep] = useState(1);
  const [running, setRunning] = useState(false);
  const [statusLog, setStatusLog] = useState(['Simulator initialized. System ready for hackathon demonstration.']);

  const handleRunStep = async (stepNum) => {
    setRunning(true);
    try {
      const res = await systemApi.advanceSimulationStep(stepNum);
      setCurrentStep(stepNum);
      setStatusLog(prev => [
        `[${new Date().toLocaleTimeString()}] Executed Step ${stepNum}: ${SIMULATION_STEPS[stepNum - 1].title}`,
        ...prev
      ]);
      await refreshData();
    } catch (err) {
      console.error('Failed to run simulation step:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < 12) {
      handleRunStep(currentStep + 1);
    }
  };

  const handleReset = async () => {
    setRunning(true);
    try {
      await systemApi.resetDemoScenario();
      setCurrentStep(1);
      setStatusLog(prev => [`[${new Date().toLocaleTimeString()}] Simulation state reset to baseline demonstration.`, ...prev]);
      await refreshData();
    } catch (err) {
      console.error('Failed to reset simulation:', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/60 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              SIH 2026 JUDGE DEMONSTRATION RUNNER
            </span>
            <span className="text-xs text-slate-400 font-mono">SIH26001</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">12-Step End-to-End Scenario Stepper</h1>
          <p className="text-xs text-slate-400">
            Automated progression through the entire disaster lifecycle: AI Prediction → Early Warning → Ground Truth Fusion → Safe Routing → SOS Triage → Rescue Coordination → Post-Disaster Learning.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={running}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Demo Baseline
          </button>

          <button
            onClick={handleNextStep}
            disabled={running || currentStep >= 12}
            className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-cyan-950/50 transition-all hover:scale-[1.01] disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {currentStep >= 12 ? 'Demo Finished' : `Advance to Step ${currentStep + 1}`}
          </button>
        </div>
      </div>

      {/* Progress Stepper Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>Scenario Progression: Step {currentStep} of 12</span>
          <span className="text-cyan-400 font-mono">{Math.round((currentStep / 12) * 100)}% Completed</span>
        </div>

        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / 12) * 100}%` }}
          />
        </div>

        {/* 12 Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {SIMULATION_STEPS.map((s) => {
            const Icon = s.icon;
            const isDone = s.step < currentStep;
            const isCurrent = s.step === currentStep;

            return (
              <div
                key={s.step}
                onClick={() => handleRunStep(s.step)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-xl shadow-cyan-950/40 ring-1 ring-cyan-500/50'
                    : isDone
                    ? 'bg-slate-950/80 border-slate-800/80 opacity-80'
                    : 'bg-slate-950/40 border-slate-800/40 opacity-50 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg bg-slate-900 border border-slate-800 ${s.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-white leading-tight">{s.title}</span>
                  </div>
                  {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-8">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live System Execution Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <h3 className="font-bold text-xs text-slate-300 flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          Live Operational Simulation Output Log
        </h3>
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-1">
          {statusLog.map((log, idx) => (
            <div key={idx} className="text-slate-400">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
