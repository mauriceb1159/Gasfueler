'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';

import { completeFuelRequestWithProof } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ActionState = {
  error?: string;
  success?: string;
};

export function FulfillmentProofForm({ requestId }: { requestId: number }) {
  const [state, action, isPending] = useActionState<ActionState, FormData>(
    completeFuelRequestWithProof,
    {}
  );

  return (
    <form action={action} className="mt-5 space-y-4">
      <input type="hidden" name="requestId" value={requestId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`actualGallons-${requestId}`} className="mb-2">
            Actual gallons
          </Label>
          <Input
            id={`actualGallons-${requestId}`}
            name="actualGallons"
            type="number"
            min="0.001"
            step="0.001"
            inputMode="decimal"
            placeholder="12.384"
            required
          />
        </div>
        <div>
          <Label htmlFor={`actualPricePerGallon-${requestId}`} className="mb-2">
            Price per gallon
          </Label>
          <Input
            id={`actualPricePerGallon-${requestId}`}
            name="actualPricePerGallon"
            type="number"
            min="0.01"
            step="0.001"
            inputMode="decimal"
            placeholder="4.799"
            required
          />
        </div>
        <div>
          <Label htmlFor={`actualFuelTotal-${requestId}`} className="mb-2">
            Pump total
          </Label>
          <Input
            id={`actualFuelTotal-${requestId}`}
            name="actualFuelTotal"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            placeholder="59.43"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={`pumpPhoto-${requestId}`} className="mb-2">
            Pump screen photo
          </Label>
          <Input
            id={`pumpPhoto-${requestId}`}
            name="pumpPhoto"
            type="file"
            accept="image/*"
            capture="environment"
            required
          />
        </div>
        <div>
          <Label htmlFor={`gasCapPhoto-${requestId}`} className="mb-2">
            Gas cap door secured photo
          </Label>
          <Input
            id={`gasCapPhoto-${requestId}`}
            name="gasCapPhoto"
            type="file"
            accept="image/*"
            capture="environment"
            required
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">{state.success}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full bg-orange-500 text-white hover:bg-orange-600 sm:w-auto"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving proof...
          </>
        ) : (
          'Complete Fuel Request'
        )}
      </Button>
    </form>
  );
}
