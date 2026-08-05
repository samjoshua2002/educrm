import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch (e) {
  // Ignore if already set or unsupported
}

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("Cloudflare R2 environment variables (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT) are not set");
  }

  return new S3Client({
    region: "auto",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(req: Request) {
  try {
    const bucketName = process.env.R2_BUCKET_NAME;
    const publicUrlBase = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

    if (!bucketName) {
      return NextResponse.json(
        { error: "R2_BUCKET_NAME environment variable is missing" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawCategory = (formData.get("category") || formData.get("folder") || "documents") as string;

    const folderMap: Record<string, string> = {
      profilePhoto: "profile_photos",
      tenthDoc: "10th_certificates",
      twelfthDoc: "12th_certificates",
      graduationDoc: "graduation_certificates",
      medicalDoc: "medical_documents",
      photo: "profile_photos",
    };

    const folderName = folderMap[rawCategory] || rawCategory.replace(/[^a-zA-Z0-9_-]/g, "_");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `applications/${folderName}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanFileName}`;

    const s3 = getS3Client();

    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
      })
    );

    // Generate signed URL valid for 7 days (604800s) to prevent 404 on private buckets
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 604800 });
    const publicUrl = publicUrlBase ? `${publicUrlBase.replace(/\/$/, "")}/${key}` : signedUrl;

    return NextResponse.json({
      success: true,
      url: signedUrl || publicUrl,
      signedUrl,
      publicUrl,
      key,
      originalName: file.name,
    });
  } catch (error: any) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload to Cloudflare R2" },
      { status: 500 }
    );
  }
}
