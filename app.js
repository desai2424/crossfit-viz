/**
 * Your Gym's 2026 Open Open Wrap
 * Affiliate-centric data visualization
 */

const COLORS = {
    red: '#ef4444',
    orange: '#f97316',
    blue: '#3B82F6',
    green: '#10B981',
    purple: '#8b5cf6',
    muted: '#94a3b8',
    bg: '#ffffff',
    grid: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
    cyan: '#06b6d4',
    pink: '#ec4899',
};

const AXIS_DEFAULTS = { gridcolor: COLORS.grid, zerolinecolor: COLORS.grid };

const PLOTLY_LAYOUT = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif', color: COLORS.text, size: 12 },
    margin: { t: 30, r: 30, b: 50, l: 60 },
    xaxis: { ...AXIS_DEFAULTS },
    yaxis: { ...AXIS_DEFAULTS, type: 'linear' },
};

const CFG = { displayModeBar: false, responsive: true };

function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return n.toLocaleString();
}

function stat(value, desc) {
    return `<div class="stat-card"><div class="stat-value">${value}</div><div class="stat-desc">${desc}</div></div>`;
}

function pctile(p) {
    if (p >= 90) return 'top 10%';
    if (p >= 75) return 'top 25%';
    if (p >= 50) return 'top half';
    return 'bottom half';
}

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ──────────────────────────────────────────
// SECTION 1: GLOBAL RANK
// ──────────────────────────────────────────
// Get user's first name from localStorage for personalization
function getUserName() {
    try {
        const access = JSON.parse(localStorage.getItem('cf_report_access') || '{}');
        const name = (access.name || '').trim();
        return name ? name.split(/\s+/)[0] : '';
    } catch { return ''; }
}

function renderGlobalRank(d, firstName) {
    // Personalize section subtitles (skip on landing page)
    if (firstName && !document.getElementById('sample-report-container')) {
        const s1 = document.querySelector('#section-1 .section-subtitle');
        if (s1) s1.textContent = `Here's where your gym lands, ${firstName}.`;
    }

    document.getElementById('hero-rank').textContent = `#${d.gym_rank.toLocaleString()}`;
    document.getElementById('hero-pct').textContent = d.overall_median_pct + '%';
    document.getElementById('hero-athletes').textContent = d.total_athletes;
    // Archetype removed per feedback

    // Update page title
    document.title = `${d.affiliate_name} — 2026 Open Wrapped`;

    const topPct = d.gym_rank_pct;
    document.getElementById('rank-stats').innerHTML =
        stat(`#${d.gym_rank.toLocaleString()}`, `out of ${d.total_gyms.toLocaleString()} affiliates`) +
        stat(`Top ${topPct.toFixed(1)}%`, 'of all gyms worldwide') +
        stat(d.total_athletes, 'athletes competed');

    // Custom percentile bar
    const pct = d.overall_median_pct;
    const el = document.getElementById('rank-chart');
    el.innerHTML = `
        <div class="pct-bar-wrapper">
            <div class="pct-bar-value"><span class="pct-bar-number">${Math.round(pct)}</span><span class="pct-bar-suffix">%</span></div>
            <div class="pct-bar-label">percentile among all affiliates</div>
            <div class="pct-bar-track">
                <div class="pct-bar-fill" style="width: ${pct}%"></div>
                <div class="pct-bar-marker" style="left: ${pct}%"></div>
            </div>
            <div class="pct-bar-ticks">
                <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
            <div class="pct-bar-context"></div>
        </div>
    `;

    // Setup share buttons
    setupShareButtons(d);
}

function setupShareButtons(d) {
    const shareBar = document.getElementById('share-bar');
    if (shareBar) shareBar.style.display = 'flex';

    const reportUrl = window.location.href;

    // Copy link
    const copyBtn = document.getElementById('share-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(reportUrl).then(() => {
                copyBtn.querySelector('span').textContent = 'Copied!';
                setTimeout(() => { copyBtn.querySelector('span').textContent = 'Copy Link'; }, 2000);
            });
        });
    }

    // Twitter/X share
    const twitterBtn = document.getElementById('share-twitter');
    if (twitterBtn) {
        const text = `My gym ranked #${d.gym_rank.toLocaleString()} out of ${d.total_gyms.toLocaleString()} in the 2026 CrossFit Open (${d.overall_median_pct}th percentile). Check your gym's scouting report:`;
        twitterBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(reportUrl)}`;
    }
}

// ──────────────────────────────────────────
// SECTION 2: STRENGTH PROFILE
// ──────────────────────────────────────────
function renderStrengthProfile(d, firstName) {
    const wods = ['wod1', 'wod2', 'wod3'];
    const gymValsCheck = wods.map(w => d.workout_stats[w].gym_median);
    const spread = Math.max(...gymValsCheck) - Math.min(...gymValsCheck);
    if (spread < 10) {
        document.getElementById('section-2').style.display = 'none';
        return;
    }
    const labels = wods.map(w => d.workout_stats[w].name);
    const gymVals = wods.map(w => d.workout_stats[w].gym_median);
    const globalVals = wods.map(w => d.workout_stats[w].global_median);

    document.getElementById('profile-stats').innerHTML =
        wods.map(w => {
            const ws = d.workout_stats[w];
            return stat(`${ws.gym_median}%`, `${ws.name} (top ${(100 - ws.gym_rank_pct).toFixed(0)}% of gyms)`);
        }).join('');

    Plotly.newPlot('profile-radar', [
        {
            type: 'scatterpolar', r: [...gymVals, gymVals[0]], theta: [...labels, labels[0]],
            fill: 'toself', name: d.affiliate_name,
            fillcolor: COLORS.blue + '33', line: { color: COLORS.blue, width: 2.5 },
        },
        {
            type: 'scatterpolar', r: [...globalVals, globalVals[0]], theta: [...labels, labels[0]],
            fill: 'toself', name: 'Global Median',
            fillcolor: COLORS.muted + '22', line: { color: COLORS.muted, width: 1.5, dash: 'dash' },
        },
    ], {
        ...PLOTLY_LAYOUT,
        polar: {
            bgcolor: 'rgba(0,0,0,0)',
            radialaxis: { visible: true, range: [0, 100], gridcolor: COLORS.grid, color: COLORS.textMuted },
            angularaxis: { color: COLORS.text },
        },
        legend: { x: 0.25, y: -0.15, bgcolor: 'rgba(0,0,0,0)' },
        margin: { t: 40, r: 80, b: 60, l: 80 },
    }, CFG);

    document.getElementById('profile-callout').innerHTML =
        `Strongest on <strong>${d.best_workout.name}</strong> &mdash; ` +
        `top ${(100 - d.workout_stats[d.best_workout.key].gym_rank_pct).toFixed(0)}% of all gyms. ` +
        `Room to grow on <strong>${d.worst_workout.name}</strong> &mdash; ` +
        `top ${(100 - d.workout_stats[d.worst_workout.key].gym_rank_pct).toFixed(0)}% of all gyms.`;
}

// ──────────────────────────────────────────
// SECTION 3: MUSCLE-UP REPORT
// ──────────────────────────────────────────
function renderMuscleUp(d, firstName) {
    const mu = d.muscle_up;
    document.getElementById('mu-global-pct').textContent = mu.global_mu_pct;

    document.getElementById('mu-stats').innerHTML =
        stat(`${mu.gym_mu_pct}%`, 'of your gym got muscle-ups') +
        stat(`${mu.global_mu_pct}%`, 'global average');

    if (mu.athletes.length === 0) return;

    // Bucket athletes by performance tier — no names shown
    const finished = mu.athletes.filter(a => a.reps >= 150);
    const close = mu.athletes.filter(a => a.reps >= 112 && a.reps < 150);
    const midRange = mu.athletes.filter(a => a.reps >= 50 && a.reps < 112);
    const earlyStop = mu.athletes.filter(a => a.reps < 50);

    const buckets = [
        { label: 'Finished the workout', count: finished.length, color: COLORS.green, desc: '150+ reps' },
        { label: 'Got muscle-ups', count: close.length, color: COLORS.blue, desc: '112–149 reps' },
        { label: 'Solid effort', count: midRange.length, color: COLORS.orange, desc: '50–111 reps' },
        { label: 'Building toward it', count: earlyStop.length, color: COLORS.muted, desc: 'Under 50 reps' },
    ].filter(b => b.count > 0);

    const total = mu.athletes.length;

    // Stacked horizontal bar
    let barHtml = '<div style="margin-top:24px">';
    barHtml += '<div style="display:flex;border-radius:8px;overflow:hidden;height:40px">';
    for (const b of buckets) {
        const pct = (b.count / total * 100).toFixed(1);
        barHtml += `<div style="width:${pct}%;background:${b.color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.85rem">${b.count}</div>`;
    }
    barHtml += '</div>';

    // Legend below bar
    barHtml += '<div style="display:flex;flex-wrap:wrap;gap:16px;margin-top:12px;justify-content:center">';
    for (const b of buckets) {
        barHtml += `<span style="font-size:0.85rem;color:#475569"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${b.color};margin-right:4px;vertical-align:middle"></span>${b.label} (${b.desc})</span>`;
    }
    barHtml += '</div>';

    // Cards below
    barHtml += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:16px;margin-top:20px">';
    for (const b of buckets) {
        barHtml += `<div style="background:${b.color}11;border:1px solid ${b.color}33;border-radius:12px;padding:24px;text-align:center">
            <div style="font-size:2.5rem;font-weight:800;color:${b.color}">${b.count}</div>
            <div style="font-size:0.95rem;font-weight:600;margin-top:4px;color:#334155">${b.label}</div>
            <div style="font-size:0.8rem;color:#94a3b8;margin-top:2px">${b.desc}</div>
        </div>`;
    }
    barHtml += '</div>';

    // Callout: athletes who got their first few muscle-ups (113-115 reps = 1-3 MUs)
    const firstMUs = mu.athletes.filter(a => a.reps >= 113 && a.reps <= 115);
    if (firstMUs.length > 0) {
        barHtml += `<div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:1px solid #bfdbfe;border-radius:12px;padding:20px 24px;margin-top:24px">
            <div style="font-weight:700;font-size:1rem;color:#1e40af;margin-bottom:8px">🎉 First Muscle-Ups Club</div>
            <div style="font-size:0.9rem;color:#475569;line-height:1.6">Getting your first ring muscle-ups in an Open workout is a milestone. Shout out to `;
        const names = firstMUs.map(a => `<strong>${a.name}</strong> (${a.reps - 112})`);
        if (names.length === 1) {
            barHtml += names[0];
        } else if (names.length === 2) {
            barHtml += names[0] + ' and ' + names[1];
        } else {
            barHtml += names.slice(0, -1).join(', ') + ', and ' + names[names.length - 1];
        }
        barHtml += ` for breaking through the wall on 26.2.</div></div>`;
    }

    barHtml += '</div>';
    document.getElementById('mu-buckets').innerHTML = barHtml;
}

// ──────────────────────────────────────────
// SECTION 4: BEST & WORST WORKOUT
// ──────────────────────────────────────────
function renderBestWorst(d, firstName) {
    const wods = ['wod1', 'wod2', 'wod3'];
    const gymMediansCheck = wods.map(w => d.workout_stats[w].gym_median);
    const spread = Math.max(...gymMediansCheck) - Math.min(...gymMediansCheck);
    if (spread < 10) {
        document.getElementById('section-4').style.display = 'none';
        return;
    }
    if (firstName) {
        const s = document.querySelector('#section-4 .section-subtitle');
        if (s) s.textContent = `${firstName}, which workout crushed it — and which one didn't`;
    }
    const names = wods.map(w => d.workout_stats[w].name);
    const gymMedians = wods.map(w => d.workout_stats[w].gym_median);
    const globalMedians = wods.map(w => d.workout_stats[w].global_median);

    document.getElementById('bw-stats').innerHTML =
        stat(d.best_workout.name, 'Best workout') +
        stat(d.worst_workout.name, 'Worst workout') +
        stat(`${(gymMedians[wods.indexOf(d.best_workout.key)] - gymMedians[wods.indexOf(d.worst_workout.key)]).toFixed(1)}%`, 'Spread between best & worst');

    Plotly.newPlot('bw-chart', [
        {
            x: names, y: gymMedians, type: 'bar', name: d.affiliate_name,
            marker: { color: COLORS.blue },
            text: gymMedians.map(p => p + '%'), textposition: 'outside',
            textfont: { color: COLORS.text, size: 13, family: 'Inter, sans-serif' },
            cliponaxis: false,
        },
        {
            x: names, y: globalMedians, type: 'bar', name: 'Global Median',
            marker: { color: COLORS.muted, opacity: 0.5 },
            text: globalMedians.map(p => p + '%'), textposition: 'outside',
            textfont: { color: COLORS.textMuted, size: 11, family: 'Inter, sans-serif' },
            cliponaxis: false,
        },
    ], {
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { family: 'Inter, sans-serif', color: COLORS.text, size: 12 },
        barmode: 'group',
        xaxis: { type: 'category', gridcolor: COLORS.grid },
        yaxis: { title: 'Median percentile', gridcolor: COLORS.grid, range: [0, 100], dtick: 20 },
        legend: { x: 0.6, y: 0.98, bgcolor: 'rgba(0,0,0,0)' },
        margin: { t: 40, r: 30, b: 50, l: 60 },
    }, CFG);

    document.getElementById('bw-callout').innerHTML =
        `Your gym's biggest edge is <strong>${d.best_workout.name}</strong> where you outperform ` +
        `${d.workout_stats[d.best_workout.key].gym_rank_pct.toFixed(0)}% of all affiliates. ` +
        `On <strong>${d.worst_workout.name}</strong>, you're at the ` +
        `${d.workout_stats[d.worst_workout.key].gym_rank_pct.toFixed(0)}th percentile among gyms &mdash; ` +
        `that's where targeted programming could move the needle.`;
}

// ──────────────────────────────────────────
// SECTION 5: SIMILAR-SIZED GYMS
// ──────────────────────────────────────────
function renderSimilarGyms(d, firstName) {
    const sim = d.similar_gyms;
    document.getElementById('sim-stats').innerHTML =
        stat(sim.similar_count, `gyms with ${sim.size_range[0]}-${sim.size_range[1]} athletes`) +
        stat(`#${sim.gym_rank_among_similar}`, `rank among similar gyms`) +
        stat(`${sim.gym_pct}%`, 'your median percentile') +
        stat(`${sim.similar_median_pct}%`, 'similar gyms\' median');

    if (sim.similar_pcts.length > 0) {
        Plotly.newPlot('sim-chart', [
            {
                x: sim.similar_pcts, type: 'histogram', nbinsx: 25,
                marker: { color: COLORS.muted, opacity: 0.6 },
                name: 'Similar-sized gyms',
                hovertemplate: '%{x:.0f}%ile: %{y} gyms<extra></extra>',
            },
        ], {
            ...PLOTLY_LAYOUT,
            xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Median athlete percentile', range: [0, 100] },
            yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Number of gyms' },
            shapes: [{
                type: 'line', x0: sim.gym_pct, x1: sim.gym_pct, y0: 0, y1: 1, yref: 'paper',
                line: { color: COLORS.blue, width: 3, dash: 'dash' },
            }],
            annotations: [{
                x: sim.gym_pct, y: 0.95, yref: 'paper',
                text: `<b>${d.affiliate_name}</b>`, showarrow: true, arrowhead: 2, ax: 80, ay: -30,
                font: { size: 13, color: COLORS.blue }, bgcolor: 'rgba(255,255,255,0.9)', borderpad: 4,
            }],
        }, CFG);
    }

    if (sim.comparable_gyms.length > 0) {
        let html = '<table class="athlete-table"><thead><tr><th>Gym</th><th>Median Percentile</th><th>Global Rank</th></tr></thead><tbody>';
        for (const g of sim.comparable_gyms) {
            const isYou = g.name === d.affiliate_name;
            html += `<tr style="${isYou ? 'background: #eff6ff; font-weight: 600;' : ''}"><td>${g.name}</td><td>${g.pct}%</td><td>#${g.rank.toLocaleString()}</td></tr>`;
        }
        html += '</tbody></table>';
        document.getElementById('sim-table').innerHTML = html;
    }
}

// ──────────────────────────────────────────
// SECTION 7: HIDDEN GEMS
// ──────────────────────────────────────────
function renderHiddenGems(d, firstName) {
    if (firstName) {
        const s = document.querySelector('#section-7 .section-subtitle');
        if (s) s.textContent = `${firstName}, these athletes might surprise you`;
    }
    const gems = d.hidden_gems;
    if (gems.length === 0) {
        document.getElementById('gems-content').innerHTML =
            '<p style="color: var(--text-muted)">No hidden gems found &mdash; your athletes are consistently ranked across all three workouts!</p>';
        return;
    }

    let html = '<table class="athlete-table"><thead><tr><th>Athlete</th><th>Overall</th><th>Best Workout</th><th>Best %ile</th><th>Gap</th></tr></thead><tbody>';
    for (const g of gems) {
        html += `<tr>
            <td>${g.name}</td>
            <td>${g.overall_pct}%</td>
            <td>${g.best_workout}</td>
            <td style="color:${COLORS.green};font-weight:600">${g.best_pct}%</td>
            <td style="color:${COLORS.blue};font-weight:600">+${g.gap}</td>
        </tr>`;
    }
    html += '</tbody></table>';
    document.getElementById('gems-content').innerHTML = html;

    const wodColors = { wod1: COLORS.red, wod2: COLORS.blue, wod3: COLORS.green };
    const wodNames = { wod1: '26.1 (Engine)', wod2: '26.2 (Gymnastics)', wod3: '26.3 (Barbell)' };
    const dotTraces = [];

    for (const [wod, color] of Object.entries(wodColors)) {
        dotTraces.push({
            y: gems.map(g => g.name),
            x: gems.map(g => g[wod]),
            type: 'scatter', mode: 'markers',
            name: wodNames[wod], marker: { color, size: 10 },
        });
    }
    for (const g of gems) {
        dotTraces.push({
            y: [g.name, g.name, g.name],
            x: [g.wod1, g.wod2, g.wod3],
            type: 'scatter', mode: 'lines',
            line: { color: COLORS.muted, width: 1 },
            showlegend: false, hoverinfo: 'skip',
        });
    }

    Plotly.newPlot('gems-chart', dotTraces, {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Percentile', range: [0, 100] },
        yaxis: { type: 'category', gridcolor: COLORS.grid, autorange: 'reversed' },
        legend: { x: 0.65, y: 0.02, bgcolor: 'rgba(0,0,0,0)' },
        margin: { t: 20, r: 30, b: 50, l: 160 },
    }, CFG);
}

// ──────────────────────────────────────────
// SECTION 8: CONSISTENCY
// ──────────────────────────────────────────
function renderConsistency(d, firstName) {
    const con = d.consistency;
    document.getElementById('con-stats').innerHTML =
        stat(con.gym_median_vol.toFixed(1), 'your gym\'s median volatility') +
        stat(con.global_median_vol.toFixed(1), 'global median volatility') +
        stat(con.gym_median_vol < con.global_median_vol ? 'More consistent' : 'More volatile', 'vs the field');

    const histMids = con.global_edges.slice(0, -1).map((e, i) => (e + con.global_edges[i + 1]) / 2);
    const traces = [
        {
            x: histMids, y: con.global_hist, type: 'bar',
            marker: { color: COLORS.muted, opacity: 0.4 },
            name: 'Global distribution',
            hovertemplate: 'Volatility %{x:.1f}: %{y} athletes<extra></extra>',
        },
    ];

    if (con.athletes.length > 0) {
        const maxHist = Math.max(...con.global_hist);
        traces.push({
            x: con.athletes.map(a => a.vol),
            y: con.athletes.map(() => maxHist * 0.02),
            type: 'scatter', mode: 'markers',
            name: 'Your athletes',
            marker: { color: COLORS.blue, size: 10, symbol: 'triangle-up', line: { width: 1, color: '#fff' } },
            hovertemplate: '%{text}: volatility %{x:.1f}<extra></extra>',
            text: con.athletes.map(a => a.name),
        });
    }

    Plotly.newPlot('con-chart', traces, {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Workout-to-workout volatility (lower = more consistent)' },
        yaxis: { title: 'Number of athletes (global)', gridcolor: COLORS.grid, rangemode: 'tozero' },
        shapes: [{
            type: 'line', x0: con.gym_median_vol, x1: con.gym_median_vol, y0: 0, y1: 1, yref: 'paper',
            line: { color: COLORS.blue, width: 2.5, dash: 'dash' },
        }],
        annotations: [{
            x: con.gym_median_vol, y: 0.95, yref: 'paper',
            text: `<b>Your gym</b>`, showarrow: true, arrowhead: 2, ax: 60, ay: -30,
            font: { size: 12, color: COLORS.blue }, bgcolor: 'rgba(255,255,255,0.9)', borderpad: 3,
        }],
        legend: { x: 0.7, y: 0.98, bgcolor: 'rgba(0,0,0,0)' },
    }, CFG);
}

// ──────────────────────────────────────────
// SECTION 9: DEMOGRAPHICS
// ──────────────────────────────────────────
function renderDemographics(d, firstName) {
    const demo = d.demographics;
    document.getElementById('demo-stats').innerHTML =
        stat(demo.gym_median_age, 'your gym\'s median age') +
        stat(demo.global_median_age, 'global median age') +
        stat(`${demo.gym_men_pct}%`, 'men') +
        stat(`${(100 - demo.gym_men_pct).toFixed(1)}%`, 'women');

    if (demo.age_bins.length === 0) return;

    Plotly.newPlot('demo-age-chart', [
        {
            x: demo.age_bins, y: demo.gym_age_pct, type: 'bar',
            name: d.affiliate_name,
            marker: { color: COLORS.blue, opacity: 0.8 },
            hovertemplate: 'Age %{x:.0f}: %{y:.1f}%<extra></extra>',
        },
        {
            x: demo.age_bins, y: demo.global_age_pct, type: 'scatter', mode: 'lines+markers',
            name: 'Global',
            line: { color: COLORS.muted, width: 2.5, dash: 'dash' },
            marker: { size: 6, color: COLORS.muted },
            hovertemplate: 'Age %{x:.0f}: %{y:.1f}%<extra></extra>',
        },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Age' },
        yaxis: { ...PLOTLY_LAYOUT.yaxis, title: '% of athletes' },
        legend: { x: 0.7, y: 0.98, bgcolor: 'rgba(0,0,0,0)' },
    }, CFG);

    // Anonymous percentile distribution histogram (skip if element missing)
    const pcts = d.athletes.filter(a => a.overall_pct > 0).map(a => a.overall_pct);
    if (pcts.length > 0 && document.getElementById('demo-pct-chart')) {
        Plotly.newPlot('demo-pct-chart', [{
            x: pcts, type: 'histogram', nbinsx: 20,
            marker: { color: COLORS.blue, opacity: 0.7 },
            hovertemplate: '%{x:.0f}th percentile: %{y} athletes<extra></extra>',
        }], {
            ...PLOTLY_LAYOUT,
            xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Overall percentile', range: [0, 100] },
            yaxis: { ...PLOTLY_LAYOUT.yaxis, title: 'Number of athletes' },
        }, CFG);
    }
}

// ──────────────────────────────────────────
// SECTION 10: FULL ROSTER HEATMAP
// ──────────────────────────────────────────
function renderAthleteCards(d, firstName) {
    if (firstName) {
        const s = document.querySelector('#section-10 .section-subtitle');
        if (s) s.textContent = `${firstName}, here's how every athlete performed`;
    }
    const athletes = d.athletes;

    const rx = athletes.filter(a => a.division.includes('rx') && a.wod1_pct > 0 && a.wod2_pct > 0 && a.wod3_pct > 0);
    if (rx.length > 0) {
        // Only show top-half athletes; hide bottom-half
        const sorted = [...rx].sort((a, b) => b.overall_pct - a.overall_pct);
        const topHalf = sorted.filter(a => a.overall_pct >= 50);
        if (topHalf.length === 0) {
            document.getElementById('section-10').style.display = 'none';
            return;
        }
        const names = topHalf.map(a => a.name);
        const z = topHalf.map(a => [a.wod1_pct, a.wod2_pct, a.wod3_pct]);

        Plotly.newPlot('cards-bump-chart', [{
            z: z, x: ['26.1', '26.2', '26.3'], y: names,
            type: 'heatmap',
            colorscale: [[0, '#fee2e2'], [0.25, '#fef9c3'], [0.5, '#d9f99d'], [0.75, '#bbf7d0'], [1, '#10B981']],
            zmin: 0, zmax: 100,
            text: z.map(row => row.map(v => v + '%')),
            texttemplate: '%{text}',
            textfont: { size: 11, family: 'Inter, sans-serif' },
            hovertemplate: '%{y}<br>%{x}: %{z:.1f}th percentile<extra></extra>',
            colorbar: { title: 'Percentile', ticksuffix: '%', len: 0.5 },
        }], {
            ...PLOTLY_LAYOUT,
            yaxis: { type: 'category', autorange: 'reversed', gridcolor: COLORS.grid },
            xaxis: { type: 'category', side: 'top', gridcolor: COLORS.grid },
            margin: { t: 60, r: 100, b: 20, l: 160 },
            height: Math.max(400, topHalf.length * 24 + 100),
        }, CFG);
    }
}

// ──────────────────────────────────────────
// SECTION 11: OPEN VETERANS
// ──────────────────────────────────────────
function renderOpenVeterans(d, firstName) {
    const athletes = d.athletes;
    // Use num_opens field if available, otherwise generate mock data based on age
    const hasRealData = athletes.some(a => a.num_opens != null);

    // Only include athletes with confirmed history data (num_opens != null)
    // null means we couldn't verify their history — don't guess
    const withOpens = athletes.filter(a => a.num_opens != null).map(a => ({
        ...a,
        num_opens: a.num_opens
    }));

    // Stats — only count confirmed data
    const opens = withOpens.map(a => a.num_opens);
    const confirmed = withOpens.length;
    const unconfirmed = athletes.length - confirmed;
    const avgOpens = confirmed > 0 ? (opens.reduce((s, v) => s + v, 0) / opens.length).toFixed(1) : '—';
    const rookies = opens.filter(n => n === 1).length;
    const vets = opens.filter(n => n >= 5).length;
    document.getElementById('vet-stats').innerHTML =
        stat(avgOpens, 'Avg Opens per athlete') +
        stat(rookies, 'Confirmed first-timers') +
        stat(vets, '5+ year veterans');

    // Histogram: distribution of # of Opens
    const maxOpens = Math.max(...opens);
    const bins = Array.from({ length: maxOpens }, (_, i) => i + 1);
    const counts = bins.map(b => opens.filter(n => n === b).length);

    Plotly.newPlot('vet-chart', [{
        x: bins, y: counts, type: 'bar',
        marker: { color: bins.map(b => b === 1 ? COLORS.orange : b >= 5 ? COLORS.green : COLORS.blue), line: { width: 0 } },
        hovertemplate: '%{x} Opens: %{y} athletes<extra></extra>',
    }], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...AXIS_DEFAULTS, title: 'Number of Opens completed', dtick: 1 },
        yaxis: { ...AXIS_DEFAULTS, title: 'Number of athletes' },
        bargap: 0.15,
    }, CFG);

    // Scatter: # Opens vs overall percentile
    Plotly.newPlot('vet-scatter', [{
        x: withOpens.map(a => a.num_opens),
        y: withOpens.map(a => a.overall_pct),
        text: withOpens.map(a => a.name),
        mode: 'markers',
        type: 'scatter',
        marker: {
            size: 10, opacity: 0.7,
            color: withOpens.map(a => a.overall_pct),
            colorscale: [[0, COLORS.red], [0.5, COLORS.orange], [1, COLORS.green]],
            cmin: 0, cmax: 100,
            line: { width: 1, color: '#fff' }
        },
        hovertemplate: '%{text}<br>Opens: %{x}<br>Percentile: %{y:.1f}%<extra></extra>',
    }], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...AXIS_DEFAULTS, title: 'Number of Opens completed', dtick: 1 },
        yaxis: { ...AXIS_DEFAULTS, title: 'Overall percentile', range: [0, 105] },
    }, CFG);

    if (!hasRealData) {
        document.querySelector('#section-11 .thesis').innerHTML += '<br><em style="color:' + COLORS.muted + ';font-size:0.85em">Data shown is estimated from athlete profiles. Full history data coming soon.</em>';
    } else if (unconfirmed > 0) {
        document.querySelector('#section-11 .thesis').innerHTML += '<br><em style="color:' + COLORS.muted + ';font-size:0.85em">History confirmed for ' + confirmed + ' of ' + athletes.length + ' athletes via CrossFit competitor ID.</em>';
    }

    // Add commentary: does experience matter?
    const vetAthletes = withOpens.filter(a => a.num_opens >= 3);
    const rookieAthletes = withOpens.filter(a => a.num_opens === 1);
    const vetAvgPct = vetAthletes.length > 0 ? (vetAthletes.reduce((s, a) => s + a.overall_pct, 0) / vetAthletes.length) : 0;
    const rookieAvgPct = rookieAthletes.length > 0 ? (rookieAthletes.reduce((s, a) => s + a.overall_pct, 0) / rookieAthletes.length) : 0;

    // Calculate per-year improvement via linear fit
    const openGroups = {};
    for (const a of withOpens) {
        const n = a.num_opens;
        if (!openGroups[n]) openGroups[n] = [];
        openGroups[n].push(a.overall_pct);
    }
    const groupAvgs = Object.entries(openGroups).map(([n, pcts]) => [parseInt(n), pcts.reduce((s, v) => s + v, 0) / pcts.length]);
    groupAvgs.sort((a, b) => a[0] - b[0]);
    let perYearGain = 0;
    if (groupAvgs.length >= 2) {
        // Simple linear regression: y = mx + b
        const n = groupAvgs.length;
        const sumX = groupAvgs.reduce((s, [x]) => s + x, 0);
        const sumY = groupAvgs.reduce((s, [, y]) => s + y, 0);
        const sumXY = groupAvgs.reduce((s, [x, y]) => s + x * y, 0);
        const sumX2 = groupAvgs.reduce((s, [x]) => s + x * x, 0);
        perYearGain = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    let commentary = '';
    if (vetAthletes.length >= 2 && rookieAthletes.length >= 2) {
        const diff = vetAvgPct - rookieAvgPct;
        const perYearStr = Math.abs(Math.round(perYearGain));
        if (diff > 10) {
            commentary = `<strong>Yes, practice makes perfect.</strong> Athletes with 3+ Opens averaged the <strong>${Math.round(vetAvgPct)}th percentile</strong>, while first-timers averaged the <strong>${Math.round(rookieAvgPct)}th</strong>. That's a <strong>${Math.round(diff)}-point gap</strong>. The athletes who keep coming back are meaningfully outperforming newcomers.${perYearGain > 0 ? ` Every subsequent year of the Open results in roughly a <strong>${perYearStr}-point percentile increase</strong> in performance.` : ''}`;
        } else if (diff > 3) {
            commentary = `<strong>Experience helps, but the gap is modest.</strong> Veterans (3+ Opens) averaged the <strong>${Math.round(vetAvgPct)}th percentile</strong> vs <strong>${Math.round(rookieAvgPct)}th</strong> for first-timers — a ${Math.round(diff)}-point edge. Your newer athletes are holding their own.${perYearGain > 0 ? ` Each additional year of the Open corresponds to about a <strong>${perYearStr}-point percentile increase</strong>.` : ''}`;
        } else if (diff > -3) {
            commentary = `<strong>Not really — your rookies are just as competitive.</strong> First-timers averaged the <strong>${Math.round(rookieAvgPct)}th percentile</strong>, nearly matching veterans at the <strong>${Math.round(vetAvgPct)}th</strong>. Your gym is doing something right with newer athletes.`;
        } else {
            commentary = `<strong>Your rookies are actually outperforming your veterans.</strong> First-timers averaged the <strong>${Math.round(rookieAvgPct)}th percentile</strong> vs <strong>${Math.round(vetAvgPct)}th</strong> for athletes with 3+ Opens. Fresh talent is coming in strong.`;
        }
    } else {
        commentary = `Most of your roster is doing the Open for the first time — not enough veterans to draw a meaningful comparison yet.`;
    }

    const insightEl = document.getElementById('vet-insight');
    if (insightEl) {
        insightEl.innerHTML = `<div style="background:#f0f4ff;border-left:4px solid ${COLORS.blue};border-radius:8px;padding:16px 20px;margin-top:16px;font-size:0.95rem;color:#334155;line-height:1.6">${commentary}</div>`;
    }
}

// ──────────────────────────────────────────
// SECTION 12: BODY COMP
// ──────────────────────────────────────────
function renderBodyComp(d, firstName) {
    const athletes = d.athletes;
    const hasRealData = athletes.some(a => a.height_in != null || a.weight_lb != null);

    // Generate plausible mock data if not available
    const withBody = athletes.map(a => {
        if (hasRealData) return a;
        const isFemale = a.division.includes('women');
        const seed = Math.abs(Math.sin(a.name.length * 13 + (a.age || 25) * 7));
        return {
            ...a,
            height_in: isFemale ? Math.round(62 + seed * 8) : Math.round(66 + seed * 10),
            weight_lb: isFemale ? Math.round(125 + seed * 40) : Math.round(165 + seed * 50),
        };
    });

    const men = withBody.filter(a => a.division.includes('men_') && !a.division.includes('women'));
    const women = withBody.filter(a => a.division.includes('women'));
    const menH = men.filter(a => a.height_in > 0);
    const menW = men.filter(a => a.weight_lb > 0);
    const womenH = women.filter(a => a.height_in > 0);
    const womenW = women.filter(a => a.weight_lb > 0);

    const fmtHeight = (inches) => { const ft = Math.floor(inches / 12); return ft + "'" + Math.round(inches % 12) + '"'; };

    // Stats — split by gender
    const allH = withBody.filter(a => a.height_in > 0);
    const allW = withBody.filter(a => a.weight_lb > 0);
    const avgMH = menH.length ? fmtHeight(menH.reduce((s, a) => s + a.height_in, 0) / menH.length) : '-';
    const avgWH = womenH.length ? fmtHeight(womenH.reduce((s, a) => s + a.height_in, 0) / womenH.length) : '-';
    const avgMW = menW.length ? Math.round(menW.reduce((s, a) => s + a.weight_lb, 0) / menW.length) + ' lb' : '-';
    const avgWW = womenW.length ? Math.round(womenW.reduce((s, a) => s + a.weight_lb, 0) / womenW.length) + ' lb' : '-';

    document.getElementById('body-stats').innerHTML =
        stat(avgMH, 'Avg male height') +
        stat(avgWH, 'Avg female height') +
        stat(avgMW, 'Avg male weight') +
        stat(avgWW, 'Avg female weight');

    // Correlation helper
    function corr(xs, ys) {
        const n = xs.length;
        if (n < 5) return 0;
        const mx = xs.reduce((a, b) => a + b) / n;
        const my = ys.reduce((a, b) => a + b) / n;
        let num = 0, dx = 0, dy = 0;
        for (let i = 0; i < n; i++) {
            num += (xs[i] - mx) * (ys[i] - my);
            dx += (xs[i] - mx) ** 2;
            dy += (ys[i] - my) ** 2;
        }
        return dx && dy ? num / Math.sqrt(dx * dy) : 0;
    }

    function corrLabel(r) {
        const abs = Math.abs(r);
        if (abs < 0.15) return 'no meaningful correlation';
        const dir = r > 0 ? 'taller/heavier athletes scored higher' : 'shorter/lighter athletes scored higher';
        if (abs < 0.3) return 'a weak trend where ' + dir;
        if (abs < 0.5) return 'a moderate correlation — ' + dir;
        return 'a strong correlation — ' + dir;
    }

    // Workout config
    const wodNames = ['26.1 (Engine)', '26.2 (Gymnastics)', '26.3 (Barbell)'];
    const wodKeys = ['wod1_pct', 'wod2_pct', 'wod3_pct'];
    const wodIds = ['wod1', 'wod2', 'wod3'];
    const wodColors = [COLORS.red, COLORS.blue, COLORS.green];

    // Filter to athletes with weight data
    const menWt = menW; // already filtered: men with weight_lb > 0
    const womenWt = womenW; // already filtered: women with weight_lb > 0

    // Hide entire section if neither gender has enough data
    if (menWt.length < 10 && womenWt.length < 10) {
        document.getElementById('section-12').style.display = 'none';
        return;
    }

    // Mini scatter — illustrative, static
    function plotWeightScatter(elId, group, yKey, color) {
        if (group.length < 10) {
            document.getElementById(elId).innerHTML = '<p style="color:' + COLORS.muted + ';text-align:center;padding:30px;font-size:0.8rem">Not enough data</p>';
            return;
        }
        const trace = {
            x: group.map(a => a.weight_lb),
            y: group.map(a => a[yKey]),
            mode: 'markers',
            type: 'scatter',
            marker: { size: 7, opacity: 0.5, color: color },
            hoverinfo: 'skip',
        };
        const layout = {
            ...PLOTLY_LAYOUT,
            margin: { l: 45, r: 10, t: 5, b: 35 },
            xaxis: { ...AXIS_DEFAULTS, title: { text: 'Weight (lbs)', font: { size: 10 } }, tickfont: { size: 10 } },
            yaxis: { ...AXIS_DEFAULTS, title: { text: 'Percentile', font: { size: 10 } }, range: [0, 105], tickfont: { size: 10 } },
            showlegend: false,
        };
        Plotly.newPlot(elId, [trace], layout, { ...CFG, staticPlot: true });
    }

    // Insight text per workout
    function insightForWod(mR, wR, menGroup, womenGroup) {
        const findings = [];
        function describe(r, gender, n) {
            if (n < 10) return null;
            const abs = Math.abs(r);
            if (abs < 0.15) return null;
            const dir = r > 0 ? 'heavier athletes scored higher' : 'lighter athletes scored higher';
            const strength = abs >= 0.5 ? 'Strong signal' : abs >= 0.3 ? 'Notable trend' : 'Mild trend';
            return '<strong>' + gender + ':</strong> ' + strength + ' — ' + dir + ' (r=' + r.toFixed(2) + ')';
        }
        const mText = describe(mR, 'Men', menGroup.length);
        const wText = describe(wR, 'Women', womenGroup.length);
        if (mText) findings.push(mText);
        if (wText) findings.push(wText);
        if (findings.length === 0) return '<span style="color:' + COLORS.muted + ';font-size:0.85rem">No meaningful correlation between weight and performance on this workout.</span>';
        return '<div style="font-size:0.85rem;line-height:1.7;color:#475569">' + findings.join('<br>') + '</div>';
    }

    // Render 6 charts (2 per workout) + insights
    for (let i = 0; i < 3; i++) {
        const key = wodKeys[i];
        const wid = wodIds[i];
        const color = wodColors[i];

        plotWeightScatter('body-' + wid + '-men', menWt, key, color);
        plotWeightScatter('body-' + wid + '-women', womenWt, key, color);

        const mR_corr = corr(menWt.map(a => a.weight_lb), menWt.map(a => a[key]));
        const wR_corr = corr(womenWt.map(a => a.weight_lb), womenWt.map(a => a[key]));

        document.getElementById('body-' + wid + '-insight').innerHTML =
            insightForWod(mR_corr, wR_corr, menWt, womenWt);
    }

    if (!hasRealData) {
        document.querySelector('#section-12 .thesis').innerHTML += '<br><em style="color:' + COLORS.muted + ';font-size:0.85em">Body comp data shown is estimated. Real height/weight data coming soon.</em>';
    }
}

// ──────────────────────────────────────────
// SECTION 13: CONSISTENCY (Horizontal Lollipop)
// ──────────────────────────────────────────
function renderConsistencyScatter(d, firstName) {
    // Only show top-half athletes by name
    const athletes = d.athletes.filter(a => a.overall_pct >= 50 && a.volatility != null);

    if (athletes.length === 0) {
        document.getElementById('consistency-scatter').innerHTML = '<p style="color:' + COLORS.muted + '">Not enough data.</p>';
        return;
    }

    const medianPct = 50;
    const medianVol = athletes.reduce((s, a) => s + a.volatility, 0) / athletes.length;

    const quadrantColor = (a) => {
        if (a.overall_pct >= medianPct && a.volatility <= medianVol) return COLORS.green;
        if (a.overall_pct >= medianPct && a.volatility > medianVol) return COLORS.orange;
        if (a.overall_pct < medianPct && a.volatility <= medianVol) return COLORS.blue;
        return COLORS.red;
    };
    const quadrantLabel = (a) => {
        if (a.overall_pct >= medianPct && a.volatility <= medianVol) return '🪨 Rock';
        if (a.overall_pct >= medianPct && a.volatility > medianVol) return '🃏 Wildcard';
        if (a.overall_pct < medianPct && a.volatility <= medianVol) return '📊 Steady';
        return '📉 Inconsistent';
    };

    // Sort by volatility ascending (most consistent first)
    const sorted = [...athletes].sort((a, b) => a.volatility - b.volatility);

    // Build lollipop: horizontal bar chart with line + dot
    const names = sorted.map(a => a.name + '  (' + a.overall_pct + '%)');
    const vols = sorted.map(a => a.volatility);
    const colors = sorted.map(a => quadrantColor(a));
    const labels = sorted.map(a => quadrantLabel(a));

    const chartHeight = Math.max(500, sorted.length * 22 + 80);

    Plotly.newPlot('consistency-scatter', [
        // Thin lines from 0 to volatility value
        {
            x: vols, y: names,
            type: 'bar', orientation: 'h',
            marker: { color: colors, opacity: 0.25, line: { width: 0 } },
            width: 0.15,
            hoverinfo: 'skip',
            showlegend: false,
        },
        // Dots at the end
        {
            x: vols, y: names,
            mode: 'markers',
            type: 'scatter',
            marker: { size: 10, color: colors, line: { width: 1.5, color: '#fff' } },
            customdata: labels,
            text: sorted.map(a => a.name),
            hovertemplate: '%{text}<br>Volatility: %{x:.1f}<br>Percentile: ' +
                sorted.map(a => a.overall_pct + '%').join('|').split('|').map(v => v).join('') +
                '<br>%{customdata}<extra></extra>',
            showlegend: false,
        },
    ], {
        ...PLOTLY_LAYOUT,
        height: chartHeight,
        xaxis: { ...AXIS_DEFAULTS, title: 'Volatility (lower = more consistent)', side: 'top', rangemode: 'tozero' },
        yaxis: { type: 'category', autorange: 'reversed', gridcolor: 'rgba(0,0,0,0)', tickfont: { size: 11 } },
        margin: { t: 50, r: 30, b: 20, l: 200 },
        bargap: 0.6,
        // Add a vertical line at the average volatility
        shapes: [{
            type: 'line', x0: medianVol, x1: medianVol, y0: -0.5, y1: sorted.length - 0.5,
            line: { color: COLORS.muted, width: 1, dash: 'dash' },
        }],
        annotations: [{
            x: medianVol, y: -0.02, yref: 'paper', text: 'Avg volatility',
            showarrow: false, font: { size: 10, color: COLORS.muted },
        }],
    }, CFG);

    // Add a legend below the chart
    const legendHtml = `<div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-top:12px;font-size:13px">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.green};margin-right:4px"></span>Rock (high pct, consistent)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.orange};margin-right:4px"></span>Wildcard (high pct, volatile)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.blue};margin-right:4px"></span>Steady (lower pct, consistent)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLORS.red};margin-right:4px"></span>Inconsistent (lower pct, volatile)</span>
    </div>`;
    document.getElementById('consistency-scatter').insertAdjacentHTML('afterend', legendHtml);
}

// ──────────────────────────────────────────
// SECTION 14: ARCHETYPE ROSTER
// ──────────────────────────────────────────
function renderArchetypeRoster(d, firstName) {
    const athletes = d.athletes.filter(a => a.archetype && a.overall_pct > 0);

    if (athletes.length === 0) {
        document.getElementById('archetype-treemap').innerHTML = '<p style="color:' + COLORS.muted + '">Not enough data.</p>';
        return;
    }

    const archColors = { Engine: COLORS.red, Gymnast: COLORS.blue, Barbell: COLORS.green };

    // Treemap
    const labels = ['Roster'];
    const parents = [''];
    const values = [0];
    const colors = ['rgba(0,0,0,0)'];
    const textLabels = [''];

    const archetypes = [...new Set(athletes.map(a => a.archetype))];
    for (const arch of archetypes) {
        labels.push(arch);
        parents.push('Roster');
        values.push(0);
        colors.push(archColors[arch] || COLORS.muted);
        textLabels.push(arch);
    }

    for (const a of athletes) {
        labels.push(a.name);
        parents.push(a.archetype);
        values.push(Math.max(1, Math.round(a.overall_pct)));
        colors.push(archColors[a.archetype] || COLORS.muted);
        textLabels.push(a.name + '<br>' + a.overall_pct + '%');
    }

    Plotly.newPlot('archetype-treemap', [{
        type: 'treemap',
        labels: labels,
        parents: parents,
        values: values,
        marker: { colors: colors, line: { width: 2, color: '#fff' } },
        text: textLabels,
        textinfo: 'text',
        hovertemplate: '%{label}<br>Percentile: %{value}%<extra></extra>',
        textfont: { size: 11, family: 'Inter, sans-serif', color: '#fff' },
    }], {
        ...PLOTLY_LAYOUT,
        margin: { t: 10, r: 10, b: 10, l: 10 },
    }, CFG);

    // Box plot: percentile distribution by archetype
    const boxTraces = archetypes.map(arch => ({
        y: athletes.filter(a => a.archetype === arch).map(a => a.overall_pct),
        name: arch,
        type: 'box',
        marker: { color: archColors[arch] || COLORS.muted },
        boxpoints: 'all',
        jitter: 0.4,
        pointpos: -1.5,
        hovertemplate: '%{y:.1f}th percentile<extra>' + arch + '</extra>',
    }));

    Plotly.newPlot('archetype-box', boxTraces, {
        ...PLOTLY_LAYOUT,
        yaxis: { ...AXIS_DEFAULTS, title: 'Overall percentile', range: [0, 105] },
        showlegend: false,
    }, CFG);
}

// ──────────────────────────────────────────
// GYM AWARDS
// ──────────────────────────────────────────
function renderAwards(d, firstName) {
    const awards = d.awards;
    if (!awards || awards.length === 0) {
        document.getElementById('awards-content').innerHTML =
            '<p style="color:var(--text-muted)">Not enough data for awards.</p>';
        return;
    }

    const awardImages = {
        'The Anchor': 'assets/awards/anchor.png',
        'The Metronome': 'assets/awards/machine.png',
        'The Wildcard': 'assets/awards/wildcard.png',
        'The Engine': 'assets/awards/engine.png',
        'The Gymnast': 'assets/awards/gymnast.png',
        'The Barbell': 'assets/awards/barbell.png',
        'The Closer': 'assets/awards/closer.png',
        'Rising Star': 'assets/awards/rising-star.png',
        'The Veteran': 'assets/awards/veteran.png',
        'Rookie': 'assets/awards/rising-star.png',
    };

    let html = '<div class="awards-grid">';
    for (const award of awards) {
        const imgSrc = awardImages[award.title] || Object.entries(awardImages).find(([k]) => award.title.includes(k.replace('The ', '')))?.[1];
        const iconHtml = imgSrc
            ? `<img src="${imgSrc}" alt="${award.title}" class="award-icon-img">`
            : `<span class="award-icon">&#127942;</span>`;
        html += `<div class="award-card">
            <div class="award-icon">${iconHtml}</div>
            <div class="award-title">${award.title}</div>
            <div class="award-name">${award.name}</div>
            <div class="award-subtitle">${award.subtitle}</div>
            <div class="award-detail">${award.detail}</div>
            <div class="award-stats">
                <span style="color:${COLORS.red}">26.1: ${award.stats.wod1 != null ? award.stats.wod1 + '%' : 'N/A'}</span>
                <span style="color:${COLORS.blue}">26.2: ${award.stats.wod2 != null ? award.stats.wod2 + '%' : 'N/A'}</span>
                <span style="color:${COLORS.green}">26.3: ${award.stats.wod3 != null ? award.stats.wod3 + '%' : 'N/A'}</span>
            </div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('awards-content').innerHTML = html;
}

// ──────────────────────────────────────────
// UNTAPPED POTENTIAL
// ──────────────────────────────────────────
function renderWhatIf(d, firstName) {
    const whatIf = d.what_if;
    if (!whatIf || whatIf.length === 0) return;
    // Only show top-half athletes
    const filtered = whatIf.filter(a => a.actual_pct >= 50);
    if (filtered.length === 0) {
        document.getElementById('section-7c').style.display = 'none';
        return;
    }

    const sorted = [...filtered].sort((a, b) => a.potential_gain - b.potential_gain);
    const traces = [
        ...sorted.map(a => ({
            y: [a.name, a.name],
            x: [a.actual_pct, a.best_pct],
            type: 'scatter', mode: 'lines',
            line: { color: COLORS.grid, width: 8 },
            showlegend: false, hoverinfo: 'skip',
        })),
        {
            y: sorted.map(a => a.name),
            x: sorted.map(a => a.actual_pct),
            type: 'scatter', mode: 'markers',
            name: 'Current average',
            marker: { color: COLORS.muted, size: 10 },
            hovertemplate: '%{y}: avg %{x:.1f}%ile<extra></extra>',
        },
        {
            y: sorted.map(a => a.name),
            x: sorted.map(a => a.best_pct),
            type: 'scatter', mode: 'markers+text',
            name: 'Best workout',
            marker: { color: COLORS.green, size: 10 },
            text: sorted.map(a => '+' + a.potential_gain),
            textposition: 'middle right',
            textfont: { size: 11, color: COLORS.green, family: 'Inter, sans-serif' },
            hovertemplate: '%{y}: best %{x:.1f}%ile (%{text})<extra></extra>',
        },
    ];

    Plotly.newPlot('whatif-chart', traces, {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Percentile', range: [0, 105] },
        yaxis: { type: 'category', gridcolor: COLORS.grid },
        legend: { x: 0.6, y: 1.05, bgcolor: 'rgba(0,0,0,0)', orientation: 'h' },
        margin: { t: 30, r: 60, b: 50, l: 160 },
        height: Math.max(350, sorted.length * 35 + 80),
    }, CFG);
}

// ──────────────────────────────────────────
// SIDEBAR NAV
// ──────────────────────────────────────────
function initSidebarNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    const links = nav.querySelectorAll('a');
    const sections = Array.from(links).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

    const hero = document.getElementById('hero');
    const heroObserver = new IntersectionObserver(([entry]) => {
        nav.style.opacity = entry.isIntersecting ? '0' : '1';
        nav.style.pointerEvents = entry.isIntersecting ? 'none' : 'auto';
    }, { threshold: 0.3 });
    if (hero) heroObserver.observe(hero);

    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                links.forEach(l => l.classList.remove('active'));
                const active = nav.querySelector(`a[href="#${entry.target.id}"]`);
                if (active) active.classList.add('active');
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach(s => sectionObserver.observe(s));

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

// ──────────────────────────────────────────
// GYM NAME REPLACEMENT
// ──────────────────────────────────────────
function replaceGymName(gymName) {
    if (!gymName) return;
    const shortName = gymName.replace(/\s*CrossFit\s*/i, '').trim() || gymName;

    // Walk text nodes and replace "Your Gym/your gym" variants
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const replacements = [
        [/Your Gym's/g, gymName + '\u2019s'],
        [/your gym's/g, gymName + '\u2019s'],
        [/Your Gym/g, gymName],
        [/your gym/g, gymName],
        [/Your gym/g, gymName],
    ];
    while (walker.nextNode()) {
        // Skip sticky CTA and footer on landing page
        if (walker.currentNode.parentElement && walker.currentNode.parentElement.closest('.lp-sticky-cta, .lp-footer, .lp-morph-brand, .lp-sample-header, .lp-hero')) continue;
        let text = walker.currentNode.textContent;
        let changed = false;
        for (const [pattern, replacement] of replacements) {
            if (pattern.test(text)) {
                text = text.replace(pattern, replacement);
                changed = true;
            }
        }
        if (changed) walker.currentNode.textContent = text;
    }

    // Also update the page title and hero h1
    document.title = `${gymName} — 2026 Open Wrapped`;
    const heroH1 = document.querySelector('.hero h1');
    if (heroH1) heroH1.innerHTML = `${gymName}'s Open. <span class="highlight">Wrapped.</span>`;
}

// ──────────────────────────────────────────
// SECTION 10: ROSTER DISTRIBUTION (Bell curve + dots)
// ──────────────────────────────────────────
function renderRosterDistribution(d, firstName) {
    const athletes = d.athletes.filter(a => a.overall_pct > 0);
    if (athletes.length === 0) return;

    const pcts = athletes.map(a => a.overall_pct);

    // Beeswarm: bin dots and stack them vertically
    const binSize = 3;
    const sorted = [...pcts].sort((a, b) => a - b);
    const binCounts = {};
    const dotX = [], dotY = [], dotColors = [];

    for (const p of sorted) {
        const bin = Math.round(p / binSize) * binSize;
        if (!binCounts[bin]) binCounts[bin] = 0;
        dotX.push(p);
        dotY.push(binCounts[bin]);
        dotColors.push(p >= 75 ? COLORS.green : p >= 50 ? COLORS.blue : COLORS.orange);
        binCounts[bin]++;
    }

    const maxStack = Math.max(...Object.values(binCounts));

    Plotly.newPlot('roster-distribution', [{
        x: dotX, y: dotY,
        type: 'scatter', mode: 'markers',
        marker: { size: 14, opacity: 0.8, color: dotColors, line: { width: 2, color: '#fff' } },
        hovertemplate: '%{x:.0f}th percentile<extra></extra>',
        showlegend: false,
    }], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...AXIS_DEFAULTS, title: 'Overall percentile', range: [-2, 105], dtick: 25 },
        yaxis: { visible: false, showgrid: false, zeroline: false, range: [-0.5, maxStack + 1] },
        margin: { t: 20, r: 30, b: 50, l: 10 },
        height: Math.min(400, Math.max(250, maxStack * 22 + 100)),
    }, CFG);

    // Add color legend below chart
    const legendEl = document.createElement('div');
    legendEl.style.cssText = 'display:flex;justify-content:center;gap:24px;margin-top:8px;font-size:0.85rem;color:#64748b';
    legendEl.innerHTML = `
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${COLORS.green};margin-right:4px;vertical-align:middle"></span>75th+ percentile</span>
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${COLORS.blue};margin-right:4px;vertical-align:middle"></span>50th–74th</span>
        <span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${COLORS.orange};margin-right:4px;vertical-align:middle"></span>Below 50th</span>
    `;
    document.getElementById('roster-distribution').after(legendEl);

    // Add insight commentary
    const insightEl = document.getElementById('roster-insight');
    if (insightEl) {
        const above75 = pcts.filter(p => p >= 75).length;
        const above50 = pcts.filter(p => p >= 50).length;
        const below50 = pcts.filter(p => p < 50).length;
        const median = sorted[Math.floor(sorted.length / 2)];
        const total = pcts.length;

        let insight = '';
        if (above75 / total > 0.5) {
            insight = `<strong>${above75} of ${total}</strong> athletes are in the 75th percentile or above — your gym is stacked. Most of your roster is outperforming the majority of the global field.`;
        } else if (above50 / total > 0.7) {
            insight = `<strong>${above50} of ${total}</strong> athletes are above the 50th percentile. Your gym is solidly above average, with room to push the middle of the pack higher.`;
        } else if (below50 / total > 0.5) {
            insight = `<strong>${below50} of ${total}</strong> athletes are below the 50th percentile. There's a big opportunity here — targeted programming could shift a significant chunk of your roster up the ranks.`;
        } else {
            insight = `Your roster is evenly spread across the field. The median athlete sits at the <strong>${Math.round(median)}th percentile</strong>. Closing the gap between your top and bottom performers is where the biggest gains live.`;
        }

        insightEl.innerHTML = `<div class="callout" style="margin-top:16px">${insight}</div>`;
    }
}

// ──────────────────────────────────────────
// PERSONAL WRAPPED CARD
// ──────────────────────────────────────────
function renderWrappedCard(d, firstName) {
    if (!firstName || !d.athletes) return;

    const nameLC = firstName.toLowerCase().trim();
    const match = d.athletes.find(a => a.name.toLowerCase() === nameLC)
        || d.athletes.find(a => a.name.toLowerCase().split(/\s+/)[0] === nameLC.split(/\s+/)[0]);
    if (!match || !match.wrapped) return;

    const w = match.wrapped;
    const persona = w.persona || w.headline;
    const section = document.getElementById('section-wrapped');
    const container = document.getElementById('wrapped-card');
    if (!section || !container) return;

    section.style.display = 'block';

    // Division label for the card
    const divisionLabels = {
        'men_rx': "Men's Rx",
        'women_rx': "Women's Rx",
        'men_scaled': "Men's Scaled",
        'women_scaled': "Women's Scaled",
    };
    const divLabel = divisionLabels[match.division] || 'Overall';

    // Gym award badge — contextualized to the gym
    const awardBadge = w.award
        ? `<div style="margin:16px 0 4px;padding:16px 12px;background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.15);border-radius:16px">
               <div style="font-size:0.5rem;letter-spacing:2px;text-transform:uppercase;color:#92753a;margin-bottom:8px">${d.affiliate_name} Award</div>
               <div style="font-size:1.3rem;font-weight:800;color:#fbbf24">\ud83c\udfc6 ${w.award}</div>
           </div>`
        : '';

    // Format percentile values — show N/A if null (compact size)
    const fmtPct = (v, color) => v != null
        ? `<div style="font-size:0.85rem;font-weight:700;color:${color}">${v}<span style="font-size:0.55rem;font-weight:400">%</span></div>`
        : `<div style="font-size:0.85rem;font-weight:700;color:#64748b">N/A</div>`;
    const overallDisplay = match.overall_pct != null
        ? `<div style="font-size:2.2rem;font-weight:900;margin:8px 0 2px;background:linear-gradient(135deg,#3b82f6,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${ordinal(Math.round(match.overall_pct))}</div>`
        : `<div style="font-size:2.2rem;font-weight:900;margin:8px 0 2px;color:#64748b">N/A</div>`;

    container.innerHTML = `
        <div id="wrapped-inner" style="background:linear-gradient(145deg, #0f172a 0%, #1a1a2e 40%, #16213e 100%);border-radius:24px;padding:36px 36px;text-align:center;color:#fff;width:420px;max-width:100%;aspect-ratio:4/5;margin:0 auto;position:relative;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
            <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:radial-gradient(circle at 20% 10%, rgba(59,130,246,0.15), transparent 45%), radial-gradient(circle at 80% 90%, rgba(16,185,129,0.12), transparent 45%), radial-gradient(circle at 50% 50%, rgba(139,92,246,0.08), transparent 60%);pointer-events:none"></div>
            <div style="position:relative;z-index:1;width:100%">
                <div style="font-size:0.6rem;letter-spacing:4px;text-transform:uppercase;color:#64748b;margin-bottom:16px">2026 CROSSFIT OPEN</div>
                <div style="font-size:2.4rem;font-weight:900;margin-bottom:2px;line-height:1.1;background:linear-gradient(135deg,#fff 0%,#94a3b8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${persona}</div>
                <div style="font-size:1.1rem;font-weight:300;color:#cbd5e1;margin:6px 0 2px;letter-spacing:0.5px">${match.name}</div>
                <div style="font-size:0.78rem;color:#64748b;margin-bottom:2px;max-width:320px;margin-left:auto;margin-right:auto;line-height:1.4">${w.tagline}</div>
                ${awardBadge}
                <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">
                    <div style="font-size:0.55rem;letter-spacing:2px;text-transform:uppercase;color:#475569;margin-bottom:8px">${divLabel} &mdash; Among 233K Athletes</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 4px">
                            ${fmtPct(match.wod1_pct, '#f87171')}
                            <div style="font-size:0.5rem;color:#64748b;margin-top:2px;letter-spacing:1px">26.1</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 4px">
                            ${fmtPct(match.wod2_pct, '#60a5fa')}
                            <div style="font-size:0.5rem;color:#64748b;margin-top:2px;letter-spacing:1px">26.2</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 4px">
                            ${fmtPct(match.wod3_pct, '#34d399')}
                            <div style="font-size:0.5rem;color:#64748b;margin-top:2px;letter-spacing:1px">26.3</div>
                        </div>
                    </div>
                    ${overallDisplay}
                    <div style="font-size:0.65rem;color:#64748b;letter-spacing:1px;text-transform:uppercase">Overall</div>
                </div>
                <div style="margin-top:16px;font-size:0.55rem;color:#475569;letter-spacing:2px;text-transform:uppercase">
                    morph
                </div>
            </div>
        </div>
        <div style="text-align:center;margin-top:20px;display:flex;justify-content:center;gap:12px">
            <button id="save-wrapped" class="share-btn" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;font-weight:600">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Share
            </button>
        </div>
    `;

    // Save to camera roll via html2canvas
    const saveBtn = document.getElementById('save-wrapped');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveBtn.textContent = 'Generating...';
            saveBtn.disabled = true;
            try {
                const el = document.getElementById('wrapped-inner');
                const canvas = await html2canvas(el, {
                    backgroundColor: '#0f172a',
                    scale: 3,
                    useCORS: true,
                    logging: false,
                });
                const link = document.createElement('a');
                link.download = `${match.name.replace(/\s+/g, '-')}-2026-open.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Saved!';
                setTimeout(() => {
                    saveBtn.innerHTML = '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Share';
                    saveBtn.disabled = false;
                }, 2000);
            } catch (e) {
                console.error('Screenshot failed:', e);
                saveBtn.textContent = 'Share';
                saveBtn.disabled = false;
            }
        });
    }
}

// ──────────────────────────────────────────
// INIT
// ──────────────────────────────────────────
async function init() {
    // Get gym ID from URL params
    const params = new URLSearchParams(window.location.search);
    const gymId = params.get('gym');
    const isEmbed = params.get('embed') === '1';
    const athleteParam = params.get('athlete');

    // In embed mode, skip access gate and hide chrome
    if (isEmbed) {
        localStorage.setItem('cf_report_access', JSON.stringify({ email: 'demo@demo.com', name: athleteParam || 'Demo', ts: Date.now() }));
        // Hide sidebar nav and footer
        const nav = document.querySelector('.sidebar-nav');
        if (nav) nav.style.display = 'none';
        const footer = document.querySelector('.footer');
        if (footer) footer.style.display = 'none';
        const morphSection = document.querySelector('.report-morph-brand');
        if (morphSection) morphSection.style.display = 'none';
        // Remove body padding for sidebar
        document.body.style.paddingLeft = '0';
    }

    if (!gymId) {
        window.location.href = '/';
        return;
    }

    try {
        const resp = await fetch(`/data/viz/reports/${gymId}.json`);
        if (!resp.ok) {
            document.getElementById('hero-gym-name').innerHTML = 'Report not found';
            return;
        }
        const d = await resp.json();
        if (d.error) {
            document.getElementById('hero-gym-name').innerHTML = d.error;
            return;
        }

        // Use athlete param if in embed mode
        const firstName = athleteParam ? athleteParam.split(' ')[0] : getUserName();
        if (athleteParam) {
            localStorage.setItem('cf_report_access', JSON.stringify({ email: 'demo@demo.com', name: athleteParam, ts: Date.now() }));
        }

        renderGlobalRank(d, firstName);
        renderStrengthProfile(d, firstName);
        renderMuscleUp(d, firstName);
        renderBestWorst(d, firstName);
        renderAwards(d, firstName);
        renderWhatIf(d, firstName);
        renderDemographics(d, firstName);
        renderRosterDistribution(d, firstName);
        renderOpenVeterans(d, firstName);

        // Replace "Your Gym/your gym" with actual gym name throughout the page
        replaceGymName(d.affiliate_name);

        // Show personalized wrapped card if user is on the roster
        renderWrappedCard(d, athleteParam || firstName);

        // In embed mode, notify parent of height for iframe resizing
        if (isEmbed) {
            const sendHeight = () => {
                window.parent.postMessage({ type: 'reportHeight', height: document.body.scrollHeight }, '*');
            };
            sendHeight();
            setTimeout(sendHeight, 1000);
            setTimeout(sendHeight, 3000);
            setTimeout(sendHeight, 5000);
        }
    } catch (e) {
        console.error('Failed to load report:', e);
        document.getElementById('hero-gym-name').innerHTML = 'Error loading report';
    }
}

// Only auto-init on report page, not landing page
if (window.location.pathname.includes('report')) {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        initSidebarNav();
    });
}
