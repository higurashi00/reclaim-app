const express = require("express");
const { ReclaimProofRequest, verifyProof } = require("@reclaimprotocol/js-sdk");
const cors = require("cors"); // Added for Cross-Origin Resource Sharing

const app = express();
const port = 3000; // Backend server port

app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: "50mb" })); // Ensure JSON body parser is used and before text parser for specific routes
app.use(express.text({ type: "text/plain", limit: "50mb" })); // To parse the urlencoded proof for /receive-proofs

// Route to generate SDK configuration for the frontend
app.get("/reclaim/generate-config", async (req, res) => {
  const APP_ID = process.env.REACT_APP_ID;
  const APP_SECRET = process.env.REACT_APP_SECRET;
  const PROVIDER_ID = process.env.REACT_APP_PROVIDER_ID;

  try {
    const reclaimProofRequest = await ReclaimProofRequest.init(
      APP_ID,
      APP_SECRET,
      PROVIDER_ID
    );
    reclaimProofRequest.setAppCallbackUrl(`http://localhost:${port}/receive-proofs`);
    const reclaimProofRequestConfig = reclaimProofRequest.toString();
    return res.json({ reclaimProofRequestConfig });
  } catch (error) {
    console.error("Error generating request config:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return res.status(500).json({ error: "Failed to generate request config", details: error.message });
  }
});

// Route to receive and verify proofs from the Reclaim app callback
// This route expects text/plain due to how frontend was sending it for proof verification
app.post("/receive-proofs", async (req, res) => {
  try {
    // The proof is sent as URL-encoded JSON in the request body by the Reclaim app, 
    // but frontend sends it as plain text JSON string for this specific endpoint.
    const proof = JSON.parse(req.body); // Assuming frontend sends JSON string in body

    console.log("Received proof object for verification:", JSON.stringify(proof, null, 2));

    const isProofValid = await verifyProof(proof);

    if (isProofValid) {
      console.log("Proof verified successfully.");
      return res.status(200).json({ status: "success", message: "Proof verified successfully", proofData: proof });
    } else {
      console.error("Proof verification failed.");
      return res.status(400).json({ status: "failure", error: "Invalid proof data" });
    }
  } catch (error) {
    console.error("Error processing/verifying proof:", error);
    // Check if the error is due to JSON parsing
    if (error instanceof SyntaxError) {
        return res.status(400).json({ status: "failure", error: "Invalid JSON format in request body for /receive-proofs" });
    }
    return res.status(500).json({ status: "failure", error: "Failed to process proof" });
  }
});

// New endpoint to receive user information and proof data
// This route expects application/json
app.post("/submit-user-info", async (req, res) => {
  try {
    const { userInfo, proof } = req.body; // req.body will be parsed as JSON by express.json()

    if (!userInfo || !proof) {
      return res.status(400).json({ status: "failure", error: "Missing userInfo or proof data in request body." });
    }

    console.log("Received User Info:", JSON.stringify(userInfo, null, 2));
    console.log("Received Proof along with User Info:", JSON.stringify(proof, null, 2));

    // Here you would typically:
    // 1. Re-verify the proof if necessary (e.g. if it hasn't been verified by /receive-proofs or if you want to be extra sure)
    //    const isProofStillValid = await verifyProof(proof);
    //    if (!isProofStillValid) {
    //        console.error("Proof submitted with user info is invalid.");
    //        return res.status(400).json({ status: "failure", error: "Invalid proof submitted with user info." });
    //    }
    // 2. Save the userInfo and relevant parts of the proof (or a reference to it) to your database.
    //    For example: await db.saveUserData(userInfo, proof.providerData.parameters.userId, proof.timestamp);
    
    // For now, just log and return success
    return res.status(200).json({ status: "success", message: "User information and proof received successfully." });

  } catch (error) {
    console.error("Error processing /submit-user-info:", error);
    // Check if the error is due to JSON parsing (though express.json() should handle this before it gets here if malformed)
    if (error instanceof SyntaxError) {
        return res.status(400).json({ status: "failure", error: "Invalid JSON format in request body for /submit-user-info" });
    }
    return res.status(500).json({ status: "failure", error: "Failed to process user information and proof." });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
  console.log(`QR Config Endpoint: http://localhost:${port}/reclaim/generate-config`);
  console.log(`Receive Proofs Endpoint: http://localhost:${port}/receive-proofs (POST, expects text/plain JSON string)`);
  console.log(`Submit User Info Endpoint: http://localhost:${port}/submit-user-info (POST, expects application/json)`);
});

