export class ExponentialBackoff {
  private initialDelay: number;
  private maxDelay: number;
  private factor: number;
  private attempts: number = 0;
  private timer: number | null = null;

  constructor(initialDelayMs = 1000, maxDelayMs = 30000, factor = 2) {
    this.initialDelay = initialDelayMs;
    this.maxDelay = maxDelayMs;
    this.factor = factor;
  }

  public getNextDelay(): number {
    const delay = Math.min(
      this.maxDelay,
      this.initialDelay * Math.pow(this.factor, this.attempts)
    );
    this.attempts++;
    // Add 10% random jitter
    const jitter = delay * 0.1 * Math.random();
    return Math.round(delay + jitter);
  }

  public scheduleReconnect(callback: () => void) {
    this.clear();
    const delay = this.getNextDelay();
    console.log(`Scheduling reconnect attempt #${this.attempts} in ${delay}ms`);
    this.timer = window.setTimeout(callback, delay);
  }

  public reset() {
    this.attempts = 0;
    this.clear();
  }

  public clear() {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public getAttemptCount(): number {
    return this.attempts;
  }
}
