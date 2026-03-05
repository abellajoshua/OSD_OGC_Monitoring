const { getSupabaseClient, getPayload } = require("../_supabase");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const supabase = getSupabaseClient();
  const payload = getPayload(req);
  const { email, password, fullName, role } = payload;

  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ 
      error: "Missing required fields: email, password, fullName, and role are required" 
    });
  }

  try {
    // Check if user already exists in database
    const { data: existingUser } = await supabase
      .from("user_accounts")
      .select("email")
      .eq("email", email)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: `User with email ${email} already exists in the database.` 
      });
    }

    // Create user in Supabase Auth using Admin API
    // This does NOT log in as the new user, keeping admin session intact
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        role: role
      }
    });

    if (authError) {
      console.error("Auth error:", authError);
      
      // Check if user exists in Auth but not in database (ghost user)
      if (authError.message.includes('already been registered') || authError.message.includes('User already registered')) {
        // Try to find and clean up the ghost user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (!listError && users) {
          const ghostUser = users.find(u => u.email === email);
          if (ghostUser) {
            // Try to add to database first
            const { error: dbInsertError } = await supabase.from("user_accounts").insert({
              user_id: ghostUser.id,
              email: email,
              full_name: fullName,
              role: role,
            });
            
            if (!dbInsertError) {
              return res.status(201).json({
                success: true,
                message: `User ${email} was found in Auth and added to database successfully`,
                user: { email, full_name: fullName, role }
              });
            }
            
            // If database insert fails, delete from Auth and try fresh creation
            await supabase.auth.admin.deleteUser(ghostUser.id);
            
            // Now try creating fresh
            const { data: newAuthData, error: newAuthError } = await supabase.auth.admin.createUser({
              email: email,
              password: password,
              email_confirm: true,
              user_metadata: { full_name: fullName, role: role }
            });
            
            if (newAuthError) {
              return res.status(500).json({ 
                error: `Failed to create user after cleanup: ${newAuthError.message}` 
              });
            }
            
            // Insert into database
            const { error: finalDbError } = await supabase.from("user_accounts").insert({
              user_id: newAuthData.user.id,
              email: email,
              full_name: fullName,
              role: role,
            });
            
            if (finalDbError) {
              await supabase.auth.admin.deleteUser(newAuthData.user.id);
              return res.status(500).json({ 
                error: `Database error after cleanup: ${finalDbError.message}` 
              });
            }
            
            return res.status(201).json({
              success: true,
              message: `User ${email} created successfully after cleanup`,
              user: { email, full_name: fullName, role }
            });
          }
        }
      }
      
      return res.status(500).json({ 
        error: `Authentication error: ${authError.message}` 
      });
    }

    if (!authData.user) {
      return res.status(500).json({ 
        error: "User creation failed - no user data returned" 
      });
    }

    // Save user account info to database
    const { error: dbError } = await supabase.from("user_accounts").insert({
      user_id: authData.user.id,
      email: email,
      full_name: fullName,
      role: role,
    });

    if (dbError) {
      console.error("Database insert error:", dbError);
      
      // Try to clean up the Auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return res.status(500).json({ 
        error: `Database error: ${dbError.message}. Auth user was also removed.` 
      });
    }

    return res.status(201).json({
      success: true,
      message: `User ${email} created successfully`,
      user: {
        email: email,
        full_name: fullName,
        role: role
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: error.message });
  }
};
