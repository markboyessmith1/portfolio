/* A camera rig for recordable scenes, run per frame instead of by CSS
   transitions, so moves have weight: every axis is a gimbal axis. The operator
   eases the goal toward the target (no hard starts), and the head follows it on
   a soft underdamped spring (inertia: it carries through, overshoots a touch and
   floats back). Cuts snap an axis, velocity and all. */

export class Axis {
  x: number
  v = 0
  goal: number
  to: number
  k = 14 // spring stiffness: how hard the head chases the goal
  z = 0.7 // damping ratio: < 1 overshoots
  lead = 5 // how quickly the operator moves the goal (1/s)

  constructor(x: number) {
    this.x = this.goal = this.to = x
  }

  /** Move to `to` in roughly `sec`, with `z` < 1 for more float. */
  aim(to: number, sec = 1.2, z = 0.7) {
    this.to = to
    this.k = (5.2 / sec) ** 2
    this.lead = 6.5 / sec
    this.z = z
  }

  /** A cut: jump there and stand still. */
  snap(x: number) {
    this.x = this.goal = this.to = x
    this.v = 0
  }

  step(dt: number) {
    this.goal += (this.to - this.goal) * (1 - Math.exp(-dt * this.lead))
    this.v += (this.k * (this.goal - this.x) - 2 * this.z * Math.sqrt(this.k) * this.v) * dt
    this.x += this.v * dt
  }
}

/** A handheld float: incommensurate sines, so it never quite repeats. */
export const drift = (t: number, freqs: number[]) =>
  freqs.reduce((sum, f, i) => sum + Math.sin(t * f * Math.PI * 2 + i * 1.7) / (i + 1), 0)
