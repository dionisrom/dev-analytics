import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Filter, X, Users, Clock, Zap, BarChart2, GitMerge, AlertTriangle, ShieldCheck, Calendar, GitCommit, CheckCircle, ArrowLeft, Settings, ChevronsUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// --- Helper Functions & Data Structures ---

const formatDuration = (milliseconds, format = 'short') => {
  if (isNaN(milliseconds) || milliseconds < 0 || milliseconds === 0) return '0s';
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (format === 'days' && days > 0) return `${days.toFixed(1)} days`;
  if (format === 'hours' && hours > 0) return `${hours.toFixed(1)} hours`;

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

// --- Mock Data Structure ---
const organization = {
    teams: [
        { 
            id: 1, name: 'Team Phoenix', 
            developers: [
                { id: 101, username: 'alice', name: 'Alice', role: 'frontend', avatar_url: 'https://placehold.co/40x40/7E22CE/FFFFFF?text=A' },
                { id: 102, username: 'bob', name: 'Bob', role: 'backend', avatar_url: 'https://placehold.co/40x40/16A34A/FFFFFF?text=B' },
            ],
            repositories: [ { id: 1, name: 'Frontend Platform' }, { id: 2, name: 'API Gateway' } ]
        },
        { 
            id: 2, name: 'Team Cobra',
            developers: [
                { id: 103, username: 'charlie', name: 'Charlie', role: 'backend', avatar_url: 'https://placehold.co/40x40/DB2777/FFFFFF?text=C' },
                { id: 104, username: 'diana', name: 'Diana', role: 'frontend', avatar_url: 'https://placehold.co/40x40/D97706/FFFFFF?text=D' },
            ],
            repositories: [ { id: 3, name: 'Data Pipeline' }, { id: 4, name: 'Mobile App' } ]
        },
        {
            id: 3, name: 'Team Velocity',
            developers: [ { id: 105, username: 'eve', name: 'Eve', role: 'frontend', avatar_url: 'https://placehold.co/40x40/0284C7/FFFFFF?text=E' } ],
            repositories: [ { id: 5, name: 'Design System' } ]
        }
    ]
};

const allDevelopers = organization.teams.flatMap(t => t.developers);
const allRepositories = organization.teams.flatMap(t => t.repositories);

const generateMockData = (count) => {
    const mrs = [], commits = [], deployments = [], incidents = [];
    const titles = ["Fix: Login button alignment", "Feat: New user profile", "Refactor: DB query performance", "Docs: Update v2.0 guide", "Chore: Upgrade dependencies", "Test: Checkout flow E2E", "Style: Dashboard card padding", "Feat: Dark mode toggle", "Fix: Missing user data crash", "Refactor: Auth service"];

    for (let i = 0; i < count; i++) {
        const team = organization.teams[Math.floor(Math.random() * organization.teams.length)];
        const author = team.developers[Math.floor(Math.random() * team.developers.length)];
        const project = team.repositories[Math.floor(Math.random() * team.repositories.length)];
        const mergedAt = new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000);
        const cycleTime = Math.random() * 7 * 24 * 60 * 60 * 1000;
        const createdAt = new Date(mergedAt.getTime() - cycleTime);
        const firstCommitAt = new Date(createdAt.getTime() + Math.random() * 3600000);
        
        for (let j = 0; j < (Math.floor(Math.random() * 5) + 1); j++) {
            commits.push({ id: `c${i}-${j}`, created_at: new Date(firstCommitAt.getTime() + j * 300000).toISOString(), author_id: author.id, project_id: project.id });
        }

        const deployedAt = new Date(mergedAt.getTime() + Math.random() * 7200000);
        const deployment = { id: 2000 + i, created_at: deployedAt.toISOString(), status: 'success', project_id: project.id, author_id: author.id };
        deployments.push(deployment);
        
        mrs.push({
            id: 1000 + i, project_id: project.id, title: titles[i % titles.length], web_url: '#', created_at: createdAt.toISOString(), merged_at: mergedAt.toISOString(),
            author, projectName: project.name, cycleTime, firstCommitAt: firstCommitAt.toISOString(), leadTimeForChange: deployedAt.getTime() - firstCommitAt.getTime(),
            firstReviewTime: Math.random() > 0.2 ? Math.random() * cycleTime : null, changes_count: (Math.floor(Math.random() * 500) + 20).toString(),
        });

        if (Math.random() < 0.1) {
            deployments.push({ ...deployment, id: deployment.id + 10000, status: 'failed' });
            const incidentCreatedAt = new Date(deployedAt.getTime() + Math.random() * 600000);
            const incidentClosedAt = new Date(incidentCreatedAt.getTime() + Math.random() * 14400000);
            incidents.push({ id: 3000 + i, project_id: project.id, created_at: incidentCreatedAt.toISOString(), closed_at: incidentClosedAt.toISOString(), author_id: author.id });
        }
    }
    return { mrs, commits, deployments, incidents };
};

const allMockData = generateMockData(300);

const ALL_KPIS = {
    deploymentFrequency: { name: 'Deployment Frequency', icon: GitMerge, unit: 'deploys in period' },
    avgLeadTime: { name: 'Lead Time for Change', icon: Clock, unit: 'from commit to deploy', format: (val) => formatDuration(val, 'hours') },
    changeFailureRate: { name: 'Change Failure Rate', icon: AlertTriangle, unit: '% of deployments cause failure', format: (val) => `${val.toFixed(1)}%` },
    avgTimeToRestore: { name: 'Time to Restore Service', icon: ShieldCheck, unit: 'to resolve incidents', format: (val) => formatDuration(val) },
    avgCycleTime: { name: 'Avg. Cycle Time', icon: Clock, unit: 'from open to merge', format: (val) => formatDuration(val, 'hours') },
    avgReviewTime: { name: 'Time to First Review', icon: Zap, unit: 'after MR is opened', format: (val) => formatDuration(val) },
    avgMrSize: { name: 'Avg. MR Size', icon: BarChart2, unit: 'lines changed', format: (val) => Math.round(val) },
    commitThroughput: { name: 'Commit Throughput', icon: GitCommit, unit: 'commits in period' },
    codingDays: { name: 'Coding Days / Week', icon: Calendar, unit: 'avg. active days for team', format: (val) => val.toFixed(1) },
};

// --- Main App Component ---
export default function App() {
  const [viewMode, setViewMode] = useState('single');
  const [drilldown, setDrilldown] = useState({ type: 'team' });
  const [selectedTeam1, setSelectedTeam1] = useState(organization.teams[0].id);
  const [selectedTeam2, setSelectedTeam2] = useState(organization.teams[1].id);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [visibleKpis, setVisibleKpis] = useState(['deploymentFrequency', 'avgLeadTime', 'changeFailureRate', 'avgTimeToRestore']);

  const calculateMetricsFor = (config) => {
    const { teamId, developerId } = config;
    const team = organization.teams.find(t => t.id === teamId);
    const developer = developerId ? allDevelopers.find(d => d.id === developerId) : null;
    const teamRepoIds = team ? team.repositories.map(r => r.id) : allRepositories.map(r => r.id);
    let teamAuthorIds = team ? team.developers.map(d => d.id) : allDevelopers.map(d => d.id);
    if (developerId) teamAuthorIds = [developerId];
    
    let data = { ...allMockData };
    if (periodFilter !== 'all') {
        const days = parseInt(periodFilter, 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const filterByDate = (d) => new Date(d.created_at || d.merged_at) >= cutoffDate;
        data = {
            mrs: data.mrs.filter(filterByDate),
            commits: data.commits.filter(filterByDate),
            deployments: data.deployments.filter(filterByDate),
            incidents: data.incidents.filter(filterByDate),
        };
    }

    data.mrs = data.mrs.filter(d => teamRepoIds.includes(d.project_id) && teamAuthorIds.includes(d.author.id));
    data.commits = data.commits.filter(d => teamRepoIds.includes(d.project_id) && teamAuthorIds.includes(d.author_id));
    data.deployments = data.deployments.filter(d => teamRepoIds.includes(d.project_id) && teamAuthorIds.includes(d.author_id));
    data.incidents = data.incidents.filter(d => teamRepoIds.includes(d.project_id) && teamAuthorIds.includes(d.author_id));

    const { mrs, commits, deployments, incidents } = data;
    
    let totalLeadTime = 0, totalCycleTime = 0, totalMrSize = 0, totalReviewTime = 0, mrsWithReview = 0;
    mrs.forEach(mr => {
      totalLeadTime += mr.leadTimeForChange;
      totalCycleTime += mr.cycleTime;
      totalMrSize += parseInt(mr.changes_count, 10);
      if (mr.firstReviewTime) { totalReviewTime += mr.firstReviewTime; mrsWithReview++; }
    });

    const successfulDeployments = deployments.filter(d => d.status === 'success');
    let totalRestoreTime = 0;
    incidents.forEach(i => { if (i.closed_at) totalRestoreTime += new Date(i.closed_at).getTime() - new Date(i.created_at).getTime(); });
    const codingDays = new Set();
    commits.forEach(c => codingDays.add(new Date(c.created_at).getDay()));
    
    const timelineData = mrs.sort((a, b) => new Date(a.merged_at) - new Date(b.merged_at)).map(mr => ({
        date: new Date(mr.merged_at).toLocaleDateString('en-CA'),
        'Lead Time (Hours)': mr.leadTimeForChange / 3600000,
    }));

    return {
      name: developer ? developer.name : (team ? team.name : 'Organization Average'),
      team, developer, mrs,
      avgLeadTime: mrs.length > 0 ? totalLeadTime / mrs.length : 0,
      avgCycleTime: mrs.length > 0 ? totalCycleTime / mrs.length : 0,
      avgReviewTime: mrsWithReview > 0 ? totalReviewTime / mrsWithReview : 0,
      avgMrSize: mrs.length > 0 ? totalMrSize / mrs.length : 0,
      deploymentFrequency: successfulDeployments.length,
      changeFailureRate: deployments.length > 0 ? (deployments.filter(d => d.status === 'failed').length / deployments.length) * 100 : 0,
      avgTimeToRestore: incidents.length > 0 ? totalRestoreTime / incidents.length : 0,
      codingDays: codingDays.size,
      commitThroughput: commits.length,
      timelineData,
    };
  };

  const metrics1 = useMemo(() => calculateMetricsFor({ teamId: selectedTeam1 }), [selectedTeam1, periodFilter]);
  const metrics2 = useMemo(() => viewMode === 'compare' ? calculateMetricsFor({ teamId: selectedTeam2 }) : null, [selectedTeam2, periodFilter, viewMode]);
  const orgAvgMetrics = useMemo(() => viewMode === 'compare' ? calculateMetricsFor({ teamId: 'org' }) : null, [periodFilter, viewMode]);
  const drilldownMetrics = useMemo(() => drilldown.type === 'developer' ? calculateMetricsFor({ teamId: selectedTeam1, developerId: drilldown.id }) : null, [drilldown, selectedTeam1, periodFilter]);

  useEffect(() => { setDrilldown({ type: 'team' }); }, [selectedTeam1]);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans flex flex-col">
      <Header />
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        <TeamSelector 
            viewMode={viewMode} setViewMode={setViewMode}
            selectedTeam1={selectedTeam1} setSelectedTeam1={setSelectedTeam1}
            selectedTeam2={selectedTeam2} setSelectedTeam2={setSelectedTeam2}
            periodFilter={periodFilter} setPeriodFilter={setPeriodFilter}
            setDrilldown={setDrilldown}
        />
        {viewMode === 'single' && drilldown.type === 'team' && <Dashboard metrics={metrics1} setDrilldown={setDrilldown} calculateMetricsFor={calculateMetricsFor} visibleKpis={visibleKpis} setVisibleKpis={setVisibleKpis} />}
        {viewMode === 'single' && drilldown.type === 'developer' && <ContributorDashboard metrics={drilldownMetrics} setDrilldown={setDrilldown} />}
        {viewMode === 'compare' && <ComparisonDashboard metrics1={metrics1} metrics2={selectedTeam2 === 'org' ? orgAvgMetrics : metrics2} />}
      </main>
    </div>
  );
}

// --- UI Components ---

const Header = () => (
  <header className="flex-shrink-0 bg-gray-900/70 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-50">
    <div className="flex items-center space-x-3">
      <BarChart2 className="h-8 w-8 text-orange-400" />
      <h1 className="text-xl font-bold tracking-tighter text-gray-200">Dev Analytics Dashboard</h1>
    </div>
    <p className="text-sm text-yellow-400 bg-yellow-900/50 px-3 py-1 rounded-full">Sample Data Mode</p>
  </header>
);

const TeamSelector = ({ viewMode, setViewMode, selectedTeam1, setSelectedTeam1, selectedTeam2, setSelectedTeam2, periodFilter, setPeriodFilter, setDrilldown }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-gray-300 font-semibold">
            <Users className="h-5 w-5" />
            <span>Analyze:</span>
        </div>
        <select value={selectedTeam1} onChange={e => setSelectedTeam1(parseInt(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition">
            {organization.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {viewMode === 'compare' && (
            <>
            <span className="text-gray-500 font-bold">vs.</span>
            <select value={selectedTeam2} onChange={e => setSelectedTeam2(e.target.value === 'org' ? 'org' : parseInt(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition">
                <option value="org">Organization Average</option>
                {organization.teams.filter(t => t.id !== selectedTeam1).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            </>
        )}
        <div className="flex-grow"></div>
        <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition">
            <option value="all">All Time</option>
            <option value="30">Last 30 Days</option>
            <option value="7">Last 7 Days</option>
        </select>
        <button onClick={() => { setViewMode(viewMode === 'single' ? 'compare' : 'single'); setDrilldown({type: 'team'}) }} className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 px-4 py-1.5 rounded-lg transition-colors">
            {viewMode === 'single' ? 'Compare Teams' : 'Single Team View'}
        </button>
    </div>
);

const Dashboard = ({ metrics, setDrilldown, calculateMetricsFor, visibleKpis, setVisibleKpis }) => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-start">
            <h2 className="text-3xl font-bold text-white tracking-tight">Team 360: <span className="text-orange-400">{metrics.name}</span></h2>
            <KpiSelector visibleKpis={visibleKpis} setVisibleKpis={setVisibleKpis} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleKpis.map(kpiKey => {
                const kpi = ALL_KPIS[kpiKey];
                const value = metrics[kpiKey];
                return <MetricCard key={kpiKey} icon={kpi.icon} title={kpi.name} value={kpi.format ? kpi.format(value) : value} unit={kpi.unit} />
            })}
        </div>
        <ChartCard title="Lead Time Over Time (Hours)">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    <Line type="monotone" dataKey="Lead Time (Hours)" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
        <ContributorTable team={metrics.team} setDrilldown={setDrilldown} calculateMetricsFor={calculateMetricsFor} />
    </div>
);

const ContributorDashboard = ({ metrics, setDrilldown }) => (
    <div className="space-y-6 animate-fade-in">
        <button onClick={() => setDrilldown({type: 'team'})} className="flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Team Overview
        </button>
        <div className="flex items-center gap-4">
            <img src={metrics.developer.avatar_url} alt={metrics.developer.name} className="h-16 w-16 rounded-full" />
            <h2 className="text-3xl font-bold text-white tracking-tight">Contributor 360: <span className="text-orange-400">{metrics.name}</span></h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard icon={GitMerge} title="Deployments" value={metrics.deploymentFrequency} unit="deploys in period" />
            <MetricCard icon={Clock} title="Avg. Lead Time" value={formatDuration(metrics.avgLeadTime, 'hours')} unit="from commit to deploy" />
            <MetricCard icon={GitCommit} title="Commit Throughput" value={metrics.commitThroughput} unit="commits in period" />
            <MetricCard icon={Calendar} title="Coding Days / Week" value={metrics.codingDays.toFixed(1)} unit="avg. active days" />
        </div>
         <ChartCard title="Lead Time Over Time (Hours)">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                    <Line type="monotone" dataKey="Lead Time (Hours)" stroke="#f97316" strokeWidth={2} dot={{r: 2}} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    </div>
);

const ContributorTable = ({ team, setDrilldown, calculateMetricsFor }) => {
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

    const contributors = useMemo(() => {
        let data = team.developers.map(dev => ({ ...dev, metrics: calculateMetricsFor({ teamId: team.id, developerId: dev.id }) }));

        if (roleFilter !== 'all') {
            data = data.filter(dev => dev.role === roleFilter);
        }

        data.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key.startsWith('metrics.')) {
                const metricKey = sortConfig.key.split('.')[1];
                aValue = a.metrics[metricKey];
                bValue = b.metrics[metricKey];
            }
            
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return data;
    }, [team, calculateMetricsFor, roleFilter, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ChevronsUpDown className="h-4 w-4 text-gray-500" />;
        if (sortConfig.direction === 'ascending') return <ArrowUp className="h-4 w-4 text-white" />;
        return <ArrowDown className="h-4 w-4 text-white" />;
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">Team Contributors</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Filter by role:</span>
                    <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition">
                        <option value="all">All Roles</option>
                        <option value="frontend">Frontend</option>
                        <option value="backend">Backend</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-600 text-sm text-gray-400">
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('name')}><div className="flex items-center gap-1">Contributor {getSortIcon('name')}</div></th>
                            <th className="p-3">Role</th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('metrics.avgLeadTime')}><div className="flex items-center gap-1">Avg. Lead Time {getSortIcon('metrics.avgLeadTime')}</div></th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('metrics.deploymentFrequency')}><div className="flex items-center gap-1">Deployments {getSortIcon('metrics.deploymentFrequency')}</div></th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('metrics.commitThroughput')}><div className="flex items-center gap-1">Commits {getSortIcon('metrics.commitThroughput')}</div></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contributors.map(dev => (
                            <tr key={dev.id} onClick={() => setDrilldown({ type: 'developer', id: dev.id })} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer">
                                <td className="p-3 flex items-center space-x-3"><img src={dev.avatar_url} alt={dev.username} className="h-8 w-8 rounded-full"/><span className="font-semibold">{dev.name}</span></td>
                                <td className="p-3 capitalize">{dev.role}</td><td className="p-3">{formatDuration(dev.metrics.avgLeadTime, 'hours')}</td><td className="p-3">{dev.metrics.deploymentFrequency}</td><td className="p-3">{dev.metrics.commitThroughput}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ComparisonDashboard = ({ metrics1, metrics2 }) => {
    if (!metrics1 || !metrics2) return null;
    const comparisonMetrics = [
        { name: 'Lead Time for Change', key: 'avgLeadTime', format: (val) => formatDuration(val, 'hours') },
        { name: 'Deployment Frequency', key: 'deploymentFrequency' },
        { name: 'Change Failure Rate', key: 'changeFailureRate', format: (val) => `${val.toFixed(1)}%` },
        { name: 'Time to Restore Service', key: 'avgTimeToRestore', format: (val) => formatDuration(val) },
        { name: 'Coding Days / Week', key: 'codingDays', format: (val) => val.toFixed(1) },
        { name: 'Commit Throughput', key: 'commitThroughput' },
    ];
    return (
        <div className="space-y-6 animate-fade-in">
             <h2 className="text-3xl font-bold text-white tracking-tight">Team Comparison</h2>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                <div className="grid grid-cols-3 gap-4 text-center"><h3 className="text-lg font-semibold text-gray-400">Metric</h3><h3 className="text-lg font-semibold text-orange-400">{metrics1.name}</h3><h3 className="text-lg font-semibold text-cyan-400">{metrics2.name}</h3></div>
                <div className="space-y-4 mt-4">
                    {comparisonMetrics.map(metric => (
                        <div key={metric.key} className="grid grid-cols-3 gap-4 items-center text-center p-3 bg-gray-900/50 rounded-lg">
                            <p className="text-gray-300 text-left">{metric.name}</p>
                            <p className="text-2xl font-bold text-white">{metric.format ? metric.format(metrics1[metric.key]) : metrics1[metric.key]}</p>
                            <p className="text-2xl font-bold text-white">{metric.format ? metric.format(metrics2[metric.key]) : metrics2[metric.key]}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const KpiSelector = ({ visibleKpis, setVisibleKpis }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const handleToggle = (kpiKey) => {
        setVisibleKpis(prev => prev.includes(kpiKey) ? prev.filter(k => k !== kpiKey) : [...prev, kpiKey]);
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                <Settings className="h-4 w-4" />
                <span>Customize Dashboard</span>
            </button>
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 p-4">
                    <p className="text-sm font-semibold text-white mb-2">Select KPIs to display</p>
                    <div className="space-y-2">
                        {Object.entries(ALL_KPIS).map(([key, kpi]) => (
                            <label key={key} className="flex items-center space-x-3 cursor-pointer">
                                <input type="checkbox" checked={visibleKpis.includes(key)} onChange={() => handleToggle(key)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500"/>
                                <span className="text-sm text-gray-300">{kpi.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ icon: Icon, title, value, unit }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col justify-between hover:border-orange-500 transition-all duration-200">
        <div>
            <div className="flex items-center space-x-3 mb-2"><Icon className="h-5 w-5 text-gray-400" /><h3 className="text-sm font-semibold text-gray-300">{title}</h3></div>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">{unit}</p>
    </div>
);

const ChartCard = ({ title, children }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
        {children}
    </div>
);

const style = document.createElement('style');
style.textContent = `@keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }`;
document.head.append(style);
