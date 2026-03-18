/**
 * Your Gym's 2026 Open Scouting Report
 * Affiliate-centric data visualization
 */

const COLORS = {
    red: '#ef4444',
    orange: '#f97316',
    blue: '#5b6abf',
    green: '#22c55e',
    purple: '#8b5cf6',
    muted: '#94a3b8',
    bg: '#ffffff',
    grid: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#64748b',
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
function renderGlobalRank(d) {
    document.getElementById('hero-gym-name').textContent = d.affiliate_name;
    document.getElementById('hero-rank').textContent = `#${d.gym_rank.toLocaleString()}`;
    document.getElementById('hero-pct').textContent = d.overall_median_pct + '%';
    document.getElementById('hero-athletes').textContent = d.total_athletes;
    document.getElementById('hero-archetype').textContent = d.gym_archetype;

    const topPct = d.gym_rank_pct;
    document.getElementById('rank-stats').innerHTML =
        stat(`#${d.gym_rank.toLocaleString()}`, `out of ${d.total_gyms.toLocaleString()} affiliates`) +
        stat(`Top ${topPct.toFixed(1)}%`, 'of all gyms worldwide') +
        stat(`${d.overall_median_pct}%`, 'median athlete percentile') +
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
            <div class="pct-bar-context">${pct >= 75 ? 'Better than ' + Math.round(pct) + '% of gyms worldwide' : pct >= 50 ? 'Above average — top half of all gyms' : 'Room to grow'}</div>
        </div>
    `;

}

// ──────────────────────────────────────────
// SECTION 2: STRENGTH PROFILE
// ──────────────────────────────────────────
function renderStrengthProfile(d) {
    const wods = ['wod1', 'wod2', 'wod3'];
    const labels = wods.map(w => d.workout_stats[w].name + '\n(' + d.workout_stats[w].type + ')');
    const gymVals = wods.map(w => d.workout_stats[w].gym_median);
    const globalVals = wods.map(w => d.workout_stats[w].global_median);

    document.getElementById('profile-stats').innerHTML =
        wods.map(w => {
            const ws = d.workout_stats[w];
            return stat(`${ws.gym_median}%`, `${ws.name} (top ${(100 - ws.gym_rank_pct).toFixed(0)}% of gyms)`);
        }).join('') +
        stat(d.gym_archetype, 'Gym archetype');

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
        `<strong>${d.affiliate_name}</strong> is a <strong>${d.gym_archetype} gym</strong>. ` +
        `Strongest on <strong>${d.best_workout.name}</strong> (${d.best_workout.type}) &mdash; ` +
        `top ${(100 - d.workout_stats[d.best_workout.key].gym_rank_pct).toFixed(0)}% of all gyms. ` +
        `Room to grow on <strong>${d.worst_workout.name}</strong> (${d.worst_workout.type}) &mdash; ` +
        `top ${(100 - d.workout_stats[d.worst_workout.key].gym_rank_pct).toFixed(0)}% of all gyms.`;
}

// ──────────────────────────────────────────
// SECTION 3: MUSCLE-UP REPORT
// ──────────────────────────────────────────
function renderMuscleUp(d) {
    const mu = d.muscle_up;
    document.getElementById('mu-global-pct').textContent = mu.global_mu_pct;

    document.getElementById('mu-stats').innerHTML =
        stat(`${mu.gym_mu_pct}%`, 'of your gym got muscle-ups') +
        stat(`${mu.global_mu_pct}%`, 'global average') +
        stat(`${mu.gym_got_mu} / ${mu.gym_total}`, 'your athletes past the wall') +
        stat(mu.gym_mu_pct > mu.global_mu_pct ? 'Above avg' : 'Below avg', 'vs the field');

    if (mu.athletes.length === 0) return;

    // Horizontal bar for each athlete showing reps, colored by whether they got MUs
    const sorted = [...mu.athletes].sort((a, b) => a.reps - b.reps);
    Plotly.newPlot('mu-chart', [{
        y: sorted.map(a => a.name),
        x: sorted.map(a => a.reps),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: sorted.map(a => a.got_mu ? COLORS.green : COLORS.red),
            opacity: 0.85,
        },
        hovertemplate: '%{y}: %{x} reps<extra></extra>',
    }], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Reps on 26.2' },
        yaxis: { type: 'category', gridcolor: COLORS.grid },
        margin: { t: 20, r: 30, b: 50, l: 160 },
        height: Math.max(400, sorted.length * 22 + 80),
        shapes: [{
            type: 'line', x0: 112, x1: 112, y0: -0.5, y1: sorted.length - 0.5,
            line: { color: COLORS.orange, width: 2.5, dash: 'dash' },
        }],
        annotations: [{
            x: 112, y: sorted.length - 1, text: '<b>MUSCLE-UPS</b>',
            showarrow: true, arrowhead: 2, ax: 60, ay: -25,
            font: { size: 11, color: COLORS.orange }, bgcolor: 'rgba(255,255,255,0.9)', borderpad: 3,
        }],
    }, CFG);
}

// ──────────────────────────────────────────
// SECTION 4: BEST & WORST WORKOUT
// ──────────────────────────────────────────
function renderBestWorst(d) {
    const wods = ['wod1', 'wod2', 'wod3'];
    const names = wods.map(w => d.workout_stats[w].name);
    const gymMedians = wods.map(w => d.workout_stats[w].gym_median);
    const globalMedians = wods.map(w => d.workout_stats[w].global_median);
    const gymRankPcts = wods.map(w => d.workout_stats[w].gym_rank_pct);

    document.getElementById('bw-stats').innerHTML =
        stat(d.best_workout.name, `Best workout (${d.best_workout.type})`) +
        stat(d.worst_workout.name, `Worst workout (${d.worst_workout.type})`) +
        stat(`${(gymMedians[wods.indexOf(d.best_workout.key)] - gymMedians[wods.indexOf(d.worst_workout.key)]).toFixed(1)}%`, 'Spread between best & worst');

    // Grouped bar chart — gym vs global per workout
    Plotly.newPlot('bw-chart', [
        {
            x: names, y: gymMedians, type: 'bar', name: d.affiliate_name,
            marker: { color: COLORS.blue },
            text: gymMedians.map(p => p + '%'), textposition: 'outside',
            textfont: { color: COLORS.text, size: 13, family: 'JetBrains Mono' },
            cliponaxis: false,
        },
        {
            x: names, y: globalMedians, type: 'bar', name: 'Global Median',
            marker: { color: COLORS.muted, opacity: 0.5 },
            text: globalMedians.map(p => p + '%'), textposition: 'outside',
            textfont: { color: COLORS.textMuted, size: 11, family: 'JetBrains Mono' },
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
function renderSimilarGyms(d) {
    const sim = d.similar_gyms;
    document.getElementById('sim-stats').innerHTML =
        stat(sim.similar_count, `gyms with ${sim.size_range[0]}-${sim.size_range[1]} athletes`) +
        stat(`#${sim.gym_rank_among_similar}`, `rank among similar gyms`) +
        stat(`${sim.gym_pct}%`, 'your median percentile') +
        stat(`${sim.similar_median_pct}%`, 'similar gyms\' median');

    // Histogram of similar gym percentiles with your gym marked
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

    // Comparable gyms table
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
// SECTION 6: RX DECISION
// ──────────────────────────────────────────
function renderRxDecision(d) {
    const rx = d.rx_decision;
    document.getElementById('rx-stats').innerHTML =
        stat(`${rx.gym_rx_pct}%`, 'of your gym went Rx') +
        stat(`${rx.global_rx_pct}%`, 'global Rx rate') +
        stat(rx.gym_rx_count, 'Rx athletes') +
        stat(rx.gym_scaled_count, 'Scaled athletes');

    const ages = rx.by_age.filter(b => b.gym_count > 0);
    if (ages.length === 0) return;

    Plotly.newPlot('rx-chart', [
        {
            x: ages.map(b => b.age_range),
            y: ages.map(b => b.gym_rx_pct),
            type: 'bar', name: d.affiliate_name,
            marker: { color: COLORS.blue, opacity: 0.85 },
            hovertemplate: '%{x}: %{y:.0f}% Rx<extra></extra>',
        },
        {
            x: ages.map(b => b.age_range),
            y: ages.map(b => b.global_rx_pct),
            type: 'scatter', mode: 'lines+markers',
            name: 'Global Rx rate',
            line: { color: COLORS.muted, width: 2.5, dash: 'dash' },
            marker: { size: 7, color: COLORS.muted },
            hovertemplate: '%{x}: %{y:.0f}% Rx globally<extra></extra>',
        },
    ], {
        ...PLOTLY_LAYOUT,
        xaxis: { ...PLOTLY_LAYOUT.xaxis, title: 'Age group', type: 'category' },
        yaxis: { title: '% who chose Rx', range: [0, 105], autorange: false, gridcolor: COLORS.grid, dtick: 20 },
        legend: { x: 0.55, y: 0.98, bgcolor: 'rgba(0,0,0,0)' },
    }, CFG);
}

// ──────────────────────────────────────────
// SECTION 7: HIDDEN GEMS
// ──────────────────────────────────────────
function renderHiddenGems(d) {
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

    // Connected dot plot for gems
    const wodColors = { wod1: COLORS.red, wod2: COLORS.blue, wod3: COLORS.green };
    const wodNames = { wod1: '26.1 (Engine)', wod2: '26.2 (Gymnastics)', wod3: '26.3 (Barbell)' };
    const dotTraces = [];

    for (const [wod, color] of Object.entries(wodColors)) {
        const pctKey = wod.replace('wod', 'wod');
        dotTraces.push({
            y: gems.map(g => g.name),
            x: gems.map(g => g[pctKey]),
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
function renderConsistency(d) {
    const con = d.consistency;
    document.getElementById('con-stats').innerHTML =
        stat(con.gym_median_vol.toFixed(1), 'your gym\'s median volatility') +
        stat(con.global_median_vol.toFixed(1), 'global median volatility') +
        stat(con.gym_median_vol < con.global_median_vol ? 'More consistent' : 'More volatile', 'vs the field');

    // Global distribution histogram + gym athletes as rug/markers
    const histMids = con.global_edges.slice(0, -1).map((e, i) => (e + con.global_edges[i + 1]) / 2);
    const traces = [
        {
            x: histMids, y: con.global_hist, type: 'bar',
            marker: { color: COLORS.muted, opacity: 0.4 },
            name: 'Global distribution',
            hovertemplate: 'Volatility %{x:.1f}: %{y} athletes<extra></extra>',
        },
    ];

    // Mark gym athletes as vertical lines on the histogram
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
function renderDemographics(d) {
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
}

// ──────────────────────────────────────────
// SECTION 10: ATHLETE CARDS
// ──────────────────────────────────────────
function renderAthleteCards(d) {
    const athletes = d.athletes;

    // Heatmap — athletes x workouts, color = percentile
    const rx = athletes.filter(a => a.division.includes('rx') && a.wod1_pct > 0 && a.wod2_pct > 0 && a.wod3_pct > 0);
    if (rx.length > 0) {
        const sorted = [...rx].sort((a, b) => b.overall_pct - a.overall_pct);
        const names = sorted.map(a => a.name);
        const z = sorted.map(a => [a.wod1_pct, a.wod2_pct, a.wod3_pct]);

        Plotly.newPlot('cards-bump-chart', [{
            z: z, x: ['26.1 (Engine)', '26.2 (Gymnastics)', '26.3 (Barbell)'], y: names,
            type: 'heatmap',
            colorscale: [[0, '#fee2e2'], [0.25, '#fef9c3'], [0.5, '#d9f99d'], [0.75, '#bbf7d0'], [1, '#22c55e']],
            zmin: 0, zmax: 100,
            text: z.map(row => row.map(v => v + '%')),
            texttemplate: '%{text}',
            textfont: { size: 11, family: 'JetBrains Mono' },
            hovertemplate: '%{y}<br>%{x}: %{z:.1f}th percentile<extra></extra>',
            colorbar: { title: 'Percentile', ticksuffix: '%', len: 0.5 },
        }], {
            ...PLOTLY_LAYOUT,
            yaxis: { type: 'category', autorange: 'reversed', gridcolor: COLORS.grid },
            xaxis: { type: 'category', side: 'top', gridcolor: COLORS.grid },
            margin: { t: 60, r: 100, b: 20, l: 160 },
            height: Math.max(400, sorted.length * 24 + 100),
        }, CFG);
    }

    // Full table with more data
    function pctColor(p) {
        if (p >= 90) return '#22c55e';
        if (p >= 75) return '#16a34a';
        if (p >= 50) return COLORS.blue;
        if (p >= 25) return COLORS.orange;
        return COLORS.red;
    }
    function pctBar(p) {
        return `<div style="display:flex;align-items:center;gap:6px">
            <div style="width:50px;height:6px;background:${COLORS.grid};border-radius:3px;overflow:hidden">
                <div style="width:${p}%;height:100%;background:${pctColor(p)};border-radius:3px"></div>
            </div>
            <span>${p}%</span>
        </div>`;
    }

    let tbl = `<table class="athlete-table" id="athletes-sortable">
        <thead><tr>
            <th>Athlete</th><th>Age</th><th>Division</th><th>Overall Rank</th><th>Overall %ile</th>
            <th>26.1</th><th>26.2</th><th>26.3</th>
            <th>Archetype</th>
        </tr></thead><tbody>`;
    for (const a of athletes) {
        const divLabel = a.division.replace('women_', 'W ').replace('men_', 'M ').replace('rx', 'Rx').replace('scaled', 'Scaled');
        const archColor = { Engine: COLORS.red, Gymnast: COLORS.blue, Barbell: COLORS.green }[a.archetype] || COLORS.muted;
        tbl += `<tr>
            <td style="font-weight:500">${a.name}</td>
            <td>${a.age || '-'}</td>
            <td>${divLabel}</td>
            <td>#${a.overall_rank.toLocaleString()}</td>
            <td>${pctBar(a.overall_pct)}</td>
            <td>${pctBar(a.wod1_pct)}</td>
            <td>${pctBar(a.wod2_pct)}</td>
            <td>${pctBar(a.wod3_pct)}</td>
            <td><span style="color:${archColor};font-weight:600">${a.archetype || '-'}</span></td>
        </tr>`;
    }
    tbl += '</tbody></table>';
    document.getElementById('cards-table').innerHTML = tbl;
}

// ──────────────────────────────────────────
// GYM AWARDS
// ──────────────────────────────────────────
function renderAwards(d) {
    const awards = d.awards;
    if (!awards || awards.length === 0) {
        document.getElementById('awards-content').innerHTML =
            '<p style="color:var(--text-muted)">Not enough data for awards.</p>';
        return;
    }

    const awardIcons = {
        'The Anchor': '&#9875;',
        'The Machine': '&#9881;',
        'The Wildcard': '&#127183;',
        'The Engine': '&#128293;',
        'The Gymnast': '&#129336;',
        'The Barbell': '&#127947;',
        'The Closer': '&#128640;',
        'Rising Star': '&#11088;',
        'The Veteran': '&#129461;',
    };

    let html = '<div class="awards-grid">';
    for (const award of awards) {
        const icon = awardIcons[award.title] || '&#127942;';
        html += `<div class="award-card">
            <div class="award-icon">${icon}</div>
            <div class="award-title">${award.title}</div>
            <div class="award-name">${award.name}</div>
            <div class="award-subtitle">${award.subtitle}</div>
            <div class="award-detail">${award.detail}</div>
            <div class="award-stats">
                <span style="color:${COLORS.red}">26.1: ${award.stats.wod1}%</span>
                <span style="color:${COLORS.blue}">26.2: ${award.stats.wod2}%</span>
                <span style="color:${COLORS.green}">26.3: ${award.stats.wod3}%</span>
            </div>
        </div>`;
    }
    html += '</div>';
    document.getElementById('awards-content').innerHTML = html;
}

// ──────────────────────────────────────────
// UNTAPPED POTENTIAL
// ──────────────────────────────────────────
function renderWhatIf(d) {
    const whatIf = d.what_if;
    if (!whatIf || whatIf.length === 0) return;

    // Dumbbell chart: actual avg vs best workout percentile
    const sorted = [...whatIf].sort((a, b) => a.potential_gain - b.potential_gain);
    const traces = [
        // Lines connecting actual to potential
        ...sorted.map(a => ({
            y: [a.name, a.name],
            x: [a.actual_pct, a.best_pct],
            type: 'scatter', mode: 'lines',
            line: { color: COLORS.grid, width: 8 },
            showlegend: false, hoverinfo: 'skip',
        })),
        // Actual dots
        {
            y: sorted.map(a => a.name),
            x: sorted.map(a => a.actual_pct),
            type: 'scatter', mode: 'markers',
            name: 'Current average',
            marker: { color: COLORS.muted, size: 10 },
            hovertemplate: '%{y}: avg %{x:.1f}%ile<extra></extra>',
        },
        // Best workout dots
        {
            y: sorted.map(a => a.name),
            x: sorted.map(a => a.best_pct),
            type: 'scatter', mode: 'markers+text',
            name: 'Best workout',
            marker: { color: COLORS.green, size: 10 },
            text: sorted.map(a => '+' + a.potential_gain),
            textposition: 'middle right',
            textfont: { size: 11, color: COLORS.green, family: 'JetBrains Mono' },
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
// INIT
// ──────────────────────────────────────────
async function init() {
    try {
        const d = await fetch('data/viz/affiliate_report.json').then(r => r.json());
        if (d.error) {
            document.getElementById('hero-gym-name').textContent = d.error;
            return;
        }

        renderGlobalRank(d);
        renderStrengthProfile(d);
        renderMuscleUp(d);
        renderBestWorst(d);
        renderSimilarGyms(d);
        renderHiddenGems(d);
        renderAwards(d);
        renderWhatIf(d);
        renderConsistency(d);
        renderDemographics(d);
        renderAthleteCards(d);
    } catch (e) {
        console.error('Failed to load report:', e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    init();
    initSidebarNav();
});
