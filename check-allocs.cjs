const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const rooms = await prisma.room.findMany({ include: { allocations: true, profiles: true } }); 
  for(const r of rooms) { 
    const allocCount = r.allocations.filter(a => a.status === 'ACTIVE').length; 
    const profCount = r.profiles.length; 
    if (allocCount !== profCount || profCount >= r.capacity) { 
      console.log(r.roomNumber, 'cap:', r.capacity, 'allocs:', allocCount, 'profs:', profCount); 
    } 
  } 
} 
main().finally(() => process.exit(0));
