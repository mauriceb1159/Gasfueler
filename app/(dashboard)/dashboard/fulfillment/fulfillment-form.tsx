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
            Gas cap door secured photo (optional during testing)
          </Label>
          <Input
            id={`gasCapPhoto-${requestId}`}
            name="gasCapPhoto"
            type="file"
            accept="image/*"
            capture="environment"
          />
        </div>
      </div>

      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
        <p className="font-semibold text-slate-950">Tire visual check</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Optional tire condition and tread photos for a later customer report.
          Visual snapshot only, not a certified safety inspection.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor={`tireFrontLeftPhoto-${requestId}`} className="mb-2">
              Front left tire
            </Label>
            <Input
              id={`tireFrontLeftPhoto-${requestId}`}
              name="tireFrontLeftPhoto"
              type="file"
              accept="image/*"
              capture="environment"
            />
          </div>
          <div>
            <Label htmlFor={`tireFrontRightPhoto-${requestId}`} className="mb-2">
              Front right tire
            </Label>
            <Input
              id={`tireFrontRightPhoto-${requestId}`}
              name="tireFrontRightPhoto"
              type="file"
              accept="image/*"
              capture="environment"
            />
          </div>
          <div>
            <Label htmlFor={`tireRearLeftPhoto-${requestId}`} className="mb-2">
              Rear left tire
            </Label>
            <Input
              id={`tireRearLeftPhoto-${requestId}`}
              name="tireRearLeftPhoto"
              type="file"
              accept="image/*"
              capture="environment"
            />
          </div>
          <div>
            <Label htmlFor={`tireRearRightPhoto-${requestId}`} className="mb-2">
              Rear right tire
            </Label>
            <Input
              id={`tireRearRightPhoto-${requestId}`}
              name="tireRearRightPhoto"
              type="file"
              accept="image/*"
              capture="environment"
            />
          </div>
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
