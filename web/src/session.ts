export class SessionGate {
  private requestId: string | null = null;
  private completed = false;

  open(requestId: string) {
    this.requestId = requestId;
    this.completed = false;
  }

  isCurrent(requestId: string) {
    return this.requestId === requestId;
  }

  claim(requestId: string) {
    if (!this.isCurrent(requestId) || this.completed) return false;
    this.completed = true;
    return true;
  }

  close(requestId: string) {
    if (!this.isCurrent(requestId)) return false;
    this.requestId = null;
    return true;
  }
}
