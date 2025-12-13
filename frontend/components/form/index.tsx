'use client';

import { RJSFSchema } from '@rjsf/utils';
import dynamic from 'next/dynamic';

// Import the new custom form with no SSR
const CustomForm = dynamic(() => import('./CustomForm'), { ssr: false });

export const Form = ({ jsonSchema, uiSchema, onSubmit }: any) => {
    return (
      <div className="w-full">
        <CustomForm 
          jsonSchema={jsonSchema} 
          uiSchema={uiSchema} 
          onSubmit={onSubmit} 
        />
      </div>
    );
};

export default Form;