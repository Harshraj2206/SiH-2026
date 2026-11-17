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
      <div className="bg-surface-2 p-3.5 rounded-tile flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-tile bg-risk-moderate/[0.12] border-risk-moderate/30 flex items-center justify-center text-risk-moderate">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-label">{t('reports_title') || 'Ground Hazard Reports'}</h1>
            <p className="text-xs text-label-2">{t('reports_subtitle') || 'Crowdsourced Field Observations & Verification'}</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setSubmissionModalOpen(true)}
          className="px-3 py-1.5 bg-risk-moderate hover:opacity-90 text-white rounded-full whitespace-nowrap text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{t('submit_report_btn') || 'Submit Hazard Report'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-full text-xs">
        {[
          { id: 'ALL', label: `${t('filter_all') || 'All'} (${reports.length})` },
          { id: 'PENDING', label: `${t('pending') || 'Pending'} (${pendingCount})` },
          { id: 'VERIFIED', label: `${t('verified') || 'Verified'} (${verifiedCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              statusFilter === tab.id
                ? 'bg-surface-2 text-label font-semibold '
                : 'text-label-2 hover:text-label'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-surface-2 rounded-tile overflow-hidden divide-y divide-line">
        {filteredReports.map((report) => (
          <div key={report.report_id} className="p-4 rounded-tile hover:bg-surface-2 transition-colors space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-xs text-label">{report.reporter_name}</span>
                <span className="text-xs text-label-2 bg-surface-2 px-1.5 py-0.5 rounded-full tabular-nums">
                  {report.zone_id}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
 report.status === 'VERIFIED' ? 'bg-risk-low/[0.12] text-risk-low ' :
 report.status === 'REJECTED' ? 'bg-risk-critical/[0.12] text-risk-critical ' :
 'bg-risk-moderate/[0.12] text-risk-moderate '
 }`}>
                  {report.status === 'VERIFIED' ? (t('verified') || 'Verified') :
                   report.status === 'REJECTED' ? (t('rejected') || 'Rejected') :
                   (t('pending') || 'Pending Verification')}
                </span>
              </div>
              <span className="text-xs text-label-2 tabular-nums">{formatDate(report.timestamp)}</span>
            </div>

            <p className="text-xs text-label-2 leading-normal">
              {report.description}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-line text-xs">
              <div className="flex items-center gap-2 text-label-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-label-2" />
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
                    className="px-2.5 py-1 bg-risk-low hover:opacity-90 text-white rounded-full whitespace-nowrap text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    {verifyingId === report.report_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                    <span>{t('verified') || 'Verify'}</span>
                  </button>
                  <button
                    onClick={() => handleAction(report.report_id, 'REJECTED')}
                    disabled={verifyingId === report.report_id}
                    className="px-2.5 py-1 bg-risk-critical hover:opacity-90 text-white rounded-full whitespace-nowrap text-xs font-semibold flex items-center gap-1 transition-colors"
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
          <div className="p-8 text-center text-xs text-label-2">
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
