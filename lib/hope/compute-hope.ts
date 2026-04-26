/**
 * Reference HOPE cycle calculator — deterministic placeholder physics for the explorer UI.
 * Replace with validated engine model when available.
 */

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(x: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, x));
}

export function computeHopeCycle(inputs: Record<string, unknown>): {
  values: Record<string, number | string>;
  value_display?: Record<string, string>;
} {
  const CR = clamp(num(inputs.CR, 12), 6, 22);
  const lambda = clamp(num(inputs.lambda, 1), 0.7, 1.5);
  const rpm = clamp(num(inputs.rpm, 3000), 800, 6000);
  const boreStroke = clamp(num(inputs.bore_stroke_ratio, 1), 0.7, 1.4);
  const P1 = clamp(num(inputs.P1_bar_ref, 1), 0.5, 2);
  const T1C = clamp(num(inputs.T1_C_ref, 25), -20, 60);
  const gamma = clamp(num(inputs.gamma_ref, 1.33), 1.2, 1.45);

  const T1_K = T1C + 273.15;
  const T2_K = T1_K * Math.pow(CR, gamma - 1);
  const T2_C = T2_K - 273.15;
  const P2_bar = P1 * Math.pow(CR, gamma);
  const P1_bar_derived = P1;

  const P3_real_bar = P2_bar * (2.15 + 0.08 * (lambda - 1));
  const P_max_bar = P3_real_bar * 1.02;
  const T3_real_C = 820 + 95 * Math.log(CR) - 70 * (lambda - 1);
  const T_exh_C = 380 + 0.035 * rpm + 4 * (CR - 10);

  const Q_in_J =
    3800 + 260 * CR * CR + 900 / Math.max(lambda, 0.75) + 40 * boreStroke;

  const eta_brake_pct = clamp(
    0.2 + 0.013 * (CR - 8) - 0.045 * Math.abs(lambda - 1.0) + 0.012 * (boreStroke - 1),
    0.12,
    0.55
  );

  const W_brake_J = Q_in_J * eta_brake_pct;
  const Q_fric_J = Q_in_J * 0.062;
  const Q_ub_J = Q_in_J * 0.018;

  const Q_cool_gross_J = Q_in_J * 0.29;
  const Q_rec_IHRL_J = Q_cool_gross_J * 0.44;
  const Q_cool_net_J = Math.max(0, Q_cool_gross_J - Q_rec_IHRL_J);

  let Q_exh_real_bal_J =
    Q_in_J - W_brake_J - Q_fric_J - Q_ub_J - Q_cool_net_J;
  if (Q_exh_real_bal_J < Q_in_J * 0.05) {
    Q_exh_real_bal_J = Q_in_J * 0.24;
  }

  const W_comp_J = -750 * Math.pow(CR, 0.97);
  const W_exp_real_J = W_brake_J - W_comp_J * 0.12;
  const W_net_real_J = W_exp_real_J + W_comp_J;

  const cyclesPerSec = rpm / 120;
  const Power_brake_kW = (W_brake_J * cyclesPerSec) / 1000;

  const BMEP_bar = clamp(
    5.5 + 0.42 * (CR - 9) + 0.0006 * (rpm - 2500) + 1.2 * (eta_brake_pct - 0.35),
    2,
    28
  );

  const bsfc_g_kWh = clamp(
    290 - 6.5 * (CR - 10) - 0.015 * rpm + 40 * Math.abs(lambda - 1),
    155,
    380
  );

  const water_phase_result =
    T3_real_C > 374
      ? "Supercritical path — review water fraction"
      : "Two-phase / vapor region (model)";

  const values: Record<string, number | string> = {
    P1_bar_derived,
    T2_C,
    P2_bar,
    P3_real_bar,
    P_max_bar,
    T3_real_C,
    T_exh_C,
    Q_in_J,
    Q_cool_gross_J,
    Q_rec_IHRL_J,
    Q_cool_net_J,
    Q_exh_real_bal_J,
    W_comp_J,
    W_exp_real_J,
    W_brake_J,
    W_net_real_J,
    Q_fric_J,
    Q_ub_J,
    eta_brake_pct,
    bsfc_g_kWh,
    BMEP_bar,
    Power_brake_kW,
    water_phase_result,
  };

  return {
    values,
    value_display: {
      m_water_display: "Internally optimized",
    },
  };
}
