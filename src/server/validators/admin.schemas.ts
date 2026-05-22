import { z } from 'zod';

const adminRoles = z.enum(['ADMIN', 'ADMIN_CAMPUS', 'ADMIN_COMMANDANT', 'MASTER_SLESAR', 'MASTER_SANTEKHNIK', 'MASTER_ELECTRIC']);
const roomStatuses = z.enum(['AVAILABLE', 'FULL', 'MAINTENANCE']);
const complaintStatuses = z.enum(['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']);

export const createDormitorySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    universityId: z.string().uuid()
  })
});

export const updateDormitorySchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    address: z.string().min(1).optional()
  })
});

export const createFloorSchema = z.object({
  body: z.object({
    dormitoryId: z.string().uuid(),
    floorNumber: z.number().int().positive()
  })
});

export const updateFloorSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    floorNumber: z.number().int().positive()
  })
});

export const createRoomSchema = z.object({
  body: z.object({
    floorId: z.string().uuid(),
    roomNumber: z.string().min(1),
    capacity: z.number().int().positive()
  })
});

export const updateRoomSchema = z.object({
  params: z.object({
    roomId: z.string().uuid()
  }),
  body: z.object({
    roomNumber: z.string().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    status: roomStatuses.optional()
  })
});

export const updateRoomStatusSchema = z.object({
  params: z.object({
    roomId: z.string().uuid()
  }),
  body: z.object({
    status: roomStatuses
  })
});

export const rejectApplicationSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    reason: z.string().min(1)
  })
});

export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: adminRoles,
    dormitoryId: z.string().uuid().optional().nullable()
  }).refine((data) => data.role !== 'ADMIN_COMMANDANT' || !!data.dormitoryId, {
    message: 'dormitoryId є обов’язковим для ADMIN_COMMANDANT',
    path: ['dormitoryId']
  })
});

export const createInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    amount: z.coerce.number().positive(),
    dueDate: z.string().datetime().or(z.string()),
    description: z.string().min(1)
  })
});

export const createMassNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    message: z.string().min(1)
  })
});

export const createJarSchema = z.object({
  body: z.object({
    title: z.string().min(1),
    goalAmount: z.coerce.number().positive(),
    description: z.string().optional(),
    dormitoryId: z.string().uuid().optional().nullable(),
    monobankUrl: z.string().url().or(z.string().length(0)).optional()
  })
});

export const updateComplaintStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  }),
  body: z.object({
    status: complaintStatuses
  })
});

