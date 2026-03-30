const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: users } = await supabase.from('profiles').select('*').in('role', ['superadmin', 'coordinator']);
  console.log("Found SuperAdmins/Coordinators:", users.length);
  
  if (users.length > 0) {
    const user = users[0];
    console.log("Testing user:", user.email, "role:", user.role);

    const { data: assignments } = await supabase.from('coordinator_supervisors').select('supervisor_id').eq('coordinator_id', user.id);
    console.log("Assignments for", user.email, ":", assignments);

    const assignedSupervisorIds = assignments ? assignments.map(a => a.supervisor_id) : [];

    if (assignedSupervisorIds.length > 0) {
      const { data: sellers } = await supabase.from('sellers').select('id, first_name, created_by').in('created_by', assignedSupervisorIds);
      console.log("Filtered sellers count:", sellers ? sellers.length : 0);
    } else {
      console.log("No assigned supervisors for this user.");
    }

    const { data: allSellers } = await supabase.from('sellers').select('id, first_name, created_by');
    console.log("Total sellers in DB:", allSellers ? allSellers.length : 0);
  }
}

test();
