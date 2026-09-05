// Global Socket.IO instance — shared across API routes via module singleton
let _io = null;

export const setIO  = (io) => { _io = io; };
export const getIO  = ()   => _io;

export function emitToAdmins(event, data) {
  _io?.to('admins').emit(event, data);
}

export function emitToCustomer(customerId, event, data) {
  _io?.to(`customer:${customerId}`).emit(event, data);
}
