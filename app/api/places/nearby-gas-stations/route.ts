import { NextRequest, NextResponse } from 'next/server';

type GoogleNearbyPlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  googleMapsUri?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
};

export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      places: [],
      message: 'GOOGLE_MAPS_API_KEY is not configured.'
    });
  }

  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: 'Valid lat and lng query params are required.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.location'
      },
      body: JSON.stringify({
        includedTypes: ['gas_station'],
        maxResultCount: 8,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: 12000
          }
        }
      }),
      cache: 'no-store'
    });

    if (!response.ok) {
      const details = await response.text();
      return NextResponse.json(
        {
          error: 'Google Places Nearby Search failed.',
          details
        },
        { status: 502 }
      );
    }

    const data = (await response.json()) as { places?: GoogleNearbyPlace[] };

    return NextResponse.json({
      configured: true,
      places: (data.places ?? []).map((place) => ({
        id: place.id ?? '',
        name: place.displayName?.text ?? 'Unnamed station',
        address: place.formattedAddress ?? '',
        googleMapsUri: place.googleMapsUri ?? null,
        latitude: place.location?.latitude ?? null,
        longitude: place.location?.longitude ?? null
      }))
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch nearby gas stations.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
