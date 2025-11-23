// This file fixes the TypeScript definition for ReactPlayer which might be outdated or mismatched
// for the 'src' prop in version 3.0+ or when used in strict mode.

import React from 'react';
import { ReactPlayerProps as BaseProps } from 'react-player';

declare module 'react-player' {
  export interface ReactPlayerProps extends BaseProps {
    // Add the src prop explicitly if it's missing from the installed types
    src?: string | string[] | MediaStream;
  }
}

