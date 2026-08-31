import React, { useState } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ReportSubmissionModal } from '../components/reports/ReportSubmissionModal';
import { formatDate } from '../utils/formatters';
import { 
  Users, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Camera, 
  ShieldCheck, 
  Loader2
} from 'lucide-react';

export const CommunityReportsPage = () => {
  const { reports, handleVerifyReport, zones } = useEmergency();
  const { isAuthority } = useAuth();
  const { t } = useLanguage();
  
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState('ALL');
  const [verifyingId, setVerifyingId] = useState(null);

  const filteredReports = reports.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesZone = selectedZoneFilter === 'ALL' || r.zone_id === selectedZoneFilter;
    return matchesStatus && matchesZone;
  });

  const pendingCount = reports.filter(r => r.status === 'PENDING').length;
  const verifiedCount = reports.filter(r => r.status === 'VERIFIED').length;

  const handleAction = async (reportId, status) => {
    setVerifyingId(reportId);
    try {
      await handleVerifyReport(reportId, status, 'Verified by field authority');
    } catch (err) {
      console.error(err);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-[#111111] border border-[#262626] p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-100">{t('reports_title') || 'Ground Hazard Reports'}</h1>
            <p className="text-xs text-neutral-400">{t('reports_subtitle') || 'Crowdsourced Field Observations & Verification'}</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setSubmissionModalOpen(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{t('submit_report_btn') || 'Submit Hazard Report'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-[#151515] p-1 rounded-md border border-[#262626] text-xs">
        {[
          { id: 'ALL', label: `${t('filter_all') || 'All'} (${reports.length})` },
          { id: 'PENDING', label: `${t('pending') || 'Pending'} (${pendingCount})` },
          { id: 'VERIFIED', label: `${t('verified') || 'Verified'} (${verifiedCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1 rounded transition-colors ${
              statusFilter === tab.id
                ? 'bg-[#1C1C1C] text-white font-semibold border border-sky-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-[#111111] border border-[#262626] rounded-lg overflow-hidden divide-y divide-[#262626]">
        {filteredReports.map((report) => (
          <div key={report.report_id} className="p-4 hover:bg-[#151515] transition-colors space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs text-neutral-100">{report.reporter_name}</span>
                <span className="text-[11px] text-sky-400 bg-[#1A1A1A] px-1.5 py-0.2 rounded border border-[#2A2A2A] font-mono">
                  {report.zone_id}
                </span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                  report.status === 'VERIFIED' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-600/30' :
                  report.status === 'REJECTED' ? 'bg-red-950/40 text-red-400 border border-red-600/30' :
                  'bg-amber-950/40 text-amber-400 border border-amber-600/30'
                }`}>
                  {report.status === 'VERIFIED' ? (t('verified') || 'Verified') :
                   report.status === 'REJECTED' ? (t('rejected') || 'Rejected') :
                   (t('pending') || 'Pending Verification')}
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-mono">{formatDate(report.timestamp)}</span>
            </div>

            <p className="text-xs text-neutral-300 leading-normal">
              {report.description}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-[#1C1C1C] text-xs">
              <div className="flex items-center gap-2 text-neutral-400 text-xs">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {report.location_text || 
                   (typeof report.lat === 'number' && typeof report.lng === 'number' 
                     ? `${report.lat.toFixed(4)}°N, ${report.lng.toFixed(4)}°E` 
                     : report.zone_id || 'Ground Observation')}
                </span>
              </div>

              {isAuthority && report.status === 'PENDING' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAction(report.report_id, 'VERIFIED')}
                    disabled={verifyingId === report.report_id}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {verifyingId === report.report_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>{t('verified') || 'Verify'}</span>
                  </button>
                  <button
                    onClick={() => handleAction(report.report_id, 'REJECTED')}
                    disabled={verifyingId === report.report_id}
                    className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>{t('rejected') || 'Reject'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="p-8 text-center text-xs text-neutral-400">
            {t('no_reports_found') || 'No hazard reports submitted yet.'}
          </div>
        )}
      </div>

      {/* Submission Modal */}
      <ReportSubmissionModal
        isOpen={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
      />
    </div>
  );
};
