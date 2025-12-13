'use client';

import RjsfForm from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';
import { rjsfShadcnTemplates, rjsfShadcnWidgets } from './rjsf-shadcn-theme';



export const Form = ({ jsonSchema, uiSchema, onSubmit }: any) => {
    return <div className=" w-full rounded-lg border-none bg-zinc-50/50 p-1">
        <div className="bg-white p-2 rounded-md border border-zinc-100 shadow-sm">
            <RjsfForm
                className="schema-form space-y-6"
                schema={jsonSchema}
                uiSchema={uiSchema}
                validator={validator}
                templates={rjsfShadcnTemplates as any}
                widgets={rjsfShadcnWidgets as any}
                onSubmit={onSubmit}
            />
        </div>
    </div>;
}

export default Form;
