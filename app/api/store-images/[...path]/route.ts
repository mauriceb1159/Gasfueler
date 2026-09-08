import { NextResponse } from 'next/server';

const storeImagesBucketName = 'store-images';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const resolvedParams = await params;
  const objectPath = resolvedParams.path.join('/');

  if (!supabaseUrl || !objectPath) {
    return new NextResponse(null, { status: 404 });
  }

  const imageUrl = `${supabaseUrl.replace(
    /\/$/,
    ''
  )}/storage/v1/object/public/${storeImagesBucketName}/${objectPath}`;
  const response = await fetch(imageUrl, {
    headers: {
      accept: 'image/*'
    }
  });

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-type': response.headers.get('content-type') ?? 'image/jpeg'
    }
  });
}
