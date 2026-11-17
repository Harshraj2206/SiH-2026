import React, { useState, useEffect } from 'react';
import { useEmergency } from '../context/EmergencyContext';
import { useAuth } from '../context/AuthContext';
import { reportsApi } from '../services/api';
import { ReportSubmissionModal } from '../components/reports/ReportSubmissionModal';
import { formatDate } from '../utils/formatters';
import { PlusCircle, CheckCircle2, MapPin, Vote } from 'lucide-react';

const STATUS_LABEL = { PENDING: 'Unverified', VERIFIED: 'Verified by an official', REJECTED: 'Not confirmed' };

export const CommunityPollPage = () => {
  const { reports, handleVerifyReport } = useEmergency();
  const { isAuthority } = useAuth();
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [poll, setPoll] = useState(null);
  const [userVoted, setUserVoted] = useState(null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState('');

  useEffect(() => {
    reportsApi.getPoll().then((d) => d?.options && setPoll(d)).catch(() => setPoll(null));
  }, []);

  const handleVotePoll = async (optionId) => {
    if (userVoted || voting) return;
    setVoting(true);
    setVoteError('');
    try {
      const updated = await reportsApi.votePoll(optionId);
      if (updated?.options) setPoll(updated);
      setUserVoted(optionId);
    } catch (e) {
      const status = e.response?.status;
      setVoteError(status === 401 ? 'Please sign in to vote.' : (e.response?.data?.detail || 'Could not record your vote. Please try again.'));
    } finally {
      setVoting(false);
    }
  };

  const types = [...new Set((reports || []).map((r) => r.report_type).filter(Boolean))];
  const filteredReports = (reports || []).filter((r) => filter === 'ALL' || r.report_type === filter);

  return (
    <div className="space-y-6 w-full pb-12">
      <div className="bg-surface p-5 rounded-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-tile bg-surface-2 flex items-center justify-center text-label shrink-0">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-label">Community</h1>
            <p className="text-xs text-label-2 mt-0.5">Answer today's poll and share what you see on the ground.</p>
          </div>
        </div>
        <button
          onClick={() => setSubmissionModalOpen(true)}
          className="px-4 py-2.5 bg-accent hover:opacity-90 text-white font-semibold rounded-full whitespace-nowrap text-xs flex items-center gap-2 self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report what you see</span>
        </button>
      </div>

      {/* Daily poll */}
      <div className="bg-surface rounded-card p-6 space-y-4">
        {!poll ? (
          <p className="text-xs text-label-2">The poll could not be loaded.</p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-label leading-snug">{poll.question}</h2>
              <span className="text-xs text-label-2 shrink-0">{poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'} today</span>
            </div>
            <p className="text-xs text-label-2">{poll.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {poll.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleVotePoll(opt.id)}
                  disabled={voting || !!userVoted}
                  className={`p-4 rounded-tile border text-left space-y-2 ${userVoted === opt.id ? 'bg-surface-2 border-label/40' : 'bg-surface-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs text-label">{opt.label}</span>
                    {userVoted === opt.id && <CheckCircle2 className="w-4 h-4 text-label shrink-0" />}
                  </div>
                  <div className="flex items-center justify-between text-xs text-label-2">
                    <span>{opt.votes} {opt.votes === 1 ? 'vote' : 'votes'}</span>
                    <span>{opt.percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-label-2" style={{ width: `${opt.percentage}%` }} />
                  </div>
                </button>
              ))}
            </div>
            {voteError && <div className="text-xs text-risk-critical">{voteError}</div>}
            {userVoted && <div className="text-xs text-label-2">Thanks, your vote is counted.</div>}
          </>
        )}
      </div>

      {/* Ground reports */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-label">Ground reports ({filteredReports.length})</h2>
          {types.length > 1 && (
            <div className="flex items-center gap-1.5 bg-surface-2 p-1.5 rounded-full text-xs overflow-x-auto">
              {['ALL', ...types].map((tp) => (
                <button
                  key={tp}
                  onClick={() => setFilter(tp)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap ${filter === tp ? 'bg-surface text-label font-semibold' : 'text-label-2 hover:text-label'}`}
                >
                  {tp === 'ALL' ? 'All' : tp}
                </button>
              ))}
            </div>
          )}
        </div>

        {filteredReports.length === 0 && (
          <div className="bg-surface rounded-card p-6 text-xs text-label-2 text-center">No reports yet.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-surface p-5 rounded-card space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-semibold text-xs text-label block">{report.user_name || 'Resident'}</span>
                  <span className="text-xs text-label-2 block">{formatDate(report.created_at)}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-label-2 shrink-0">
                  {STATUS_LABEL[report.status] || report.status}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-label-2">
                <span className="px-2 py-0.5 rounded-full bg-surface-2">{report.report_type}</span>
                {(report.location_name || report.latitude != null) && (
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{report.location_name || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                  </span>
                )}
              </div>
              {report.signs_observed?.length > 0 && (
                <ul className="text-xs text-label-2 list-disc list-inside">
                  {report.signs_observed.map((s) => <li key={s}>{s}</li>)}
                </ul>
              )}
              <p className="text-xs text-label leading-relaxed">{report.description}</p>
              {report.reviewer_notes && <p className="text-xs text-label-2">Reviewer: {report.reviewer_notes}</p>}
              {isAuthority && report.status === 'PENDING' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => handleVerifyReport(report.id, 'VERIFIED')} className="px-3 py-1 rounded-full bg-surface-2 text-xs text-label">Verify</button>
                  <button onClick={() => handleVerifyReport(report.id, 'REJECTED')} className="px-3 py-1 rounded-full bg-surface-2 text-xs text-label-2">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ReportSubmissionModal isOpen={submissionModalOpen} onClose={() => setSubmissionModalOpen(false)} />
    </div>
  );
};
