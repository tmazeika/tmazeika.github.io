---
title: "React Hooks: Build Your Own useForm()"
---

Forms in React are particularly tedious to implement because each input component demands its own `useState()` hook and change handler. There's [a](https://final-form.org/react) [ton](https://react-hook-form.com/) [of](https://www.telerik.com/kendo-react-ui/components/form/) [libraries](https://formik.org/) out there that alleviate some of those pains and add validation utilities. But, unless you have a use case that calls for any of those advanced features, you're probably better off writing your own hook. After all, [a little copying is better than a little dependency](https://www.youtube.com/watch?v=PAAkCSZUG1c&t=9m28s).

## Usage

Before we get to the implementation, here's what we're trying to achieve:

```tsx
// App.tsx

import React from 'react';
import useForm, { FormValueController } from './useForm';

function App(): JSX.Element {
  const form = useForm({
    initialValues: {
      name: '',
      email: '',
    },
    onValidate(values, errors) {
      // Setting at least one error here will prevent `onSubmit` from being
      // called.
      if (values.name === '') errors.name = 'Name cannot be empty.';
      if (values.email === '') errors.email = 'Email cannot be empty.';
    },
    // Can be async! With async, `form.isSubmitting` will be true until the
    // promise resolves. Without async, `form.isSubmitting` never turns to true.
    onSubmit(values) {
      alert(`Submitting name=${values.name} email=${values.email}`);
    },
  });

  return (
    <form onSubmit={form.onSubmit}>
      <input
        placeholder="Name"
        value={form.values.name}
        // Note that 'name' type checks and cannot be anything other than 'name'
        // or 'email'. 
        onChange={(e) => form.set('name', e.target.value)}
      />
      {/* Check for a name error and display it if it's not undefined. */}
      {form.errors.name && (
        <p>{form.errors.name}</p>
      )}
      {/* Use `form.control()` to create a controller for a specific form value 
      that can get or set that value. */}
      <EmailInput controller={form.control('email')}/>
      {form.errors.email && (
        <p>{form.errors.email}</p>
      )}
      <input type="submit" value="Submit" disabled={form.isSubmitting}/>
      <input type="reset" value="Reset" onClick={form.reset}/>
    </form>
  );
}

interface EmailInputProps {
  /** A controller that gets and sets the value of this email input field. */
  controller: FormValueController<string>;
}

function EmailInput(props: EmailInputProps): JSX.Element {
  return (
    <input
      placeholder="Email"
      value={props.controller.value}
      onChange={(e) => props.controller.set(e.target.value)}
    />
  );
}

export default App;
```

The best part about this is that everything is fully type checked. Given the hook's `initialValues` option, we can guarantee that a value's type won't accidentally be changed (or be unexpectedly set to `undefined`, which is a whole [other problem](https://stackoverflow.com/questions/37427508/react-changing-an-uncontrolled-input)). See that `form.set('name', 5)` won't type check, but it would if the initial value of `name` was a number. Nor would `form.set('nmae', '...')` type check.

## Implementation

```typescript
// useForm.ts

import { SyntheticEvent, useCallback, useReducer, useState } from 'react';

/** Controls a single form value. */
export interface FormValueController<T> {
  /** The current value. */
  readonly value: Readonly<T>;

  /** Sets the value. */
  set(value: T): void;
}

/** A map of form keys to errors found during their validation. */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

export interface Form<T> {
  /** All values of the form. */
  readonly values: Readonly<T>;
  /** Errors in the form. */
  readonly errors: Readonly<FormErrors<T>>;
  /** Whether the form is in the process of being submitted. */
  readonly isSubmitting: boolean;

  /** Sets a single value. */
  set<K extends keyof T>(this: void, key: K, value: T[K]): void;

  /**
   * Sets many values at once. Especially useful for prefilling data after a
   * `fetch()`, for example.
   */
  setMany(this: void, data: Partial<T>): void;

  /** Creates a controller for a value. */
  control<K extends keyof T>(this: void, key: K): FormValueController<T[K]>;

  /** Submits this form after validating input. */
  onSubmit(this: void, e?: SyntheticEvent): void;

  /** Resets all values. */
  reset(this: void): void;
}

/**
 * Controls an HTML form.
 * 
 * @param initialValues The initial values of the form inputs.
 * @param onValidate    Called to validate each input.
 * @param onSubmit      Called to submit the form.
 */
export default function useForm<T>({
  initialValues,
  onValidate,
  onSubmit,
}: {
  initialValues: T;
  onValidate?: (values: Readonly<T>, errors: FormErrors<T>) => void;
  onSubmit?: (values: Readonly<T>) => Promise<void> | void;
}): Form<T> {
  const [values, dispatch] = useReducer(
    // This reducer turns actions into reducers. See why in the `set()` function
    // below.
    (state: T, action: (state: T) => T) => action(state),
    initialValues,
  );
  const [errors, setErrors] = useState<FormErrors<T>>({});
  const [isSubmitting, setSubmitting] = useState(false);

  const set = useCallback(<K extends keyof T>(k: K, v: T[K]) => {
    dispatch((state) =>
      // This action _is_ a reducer: only update the state when state[k] = v 
      // would actually change anything. This is done to avoid an infinite
      // update loop if `set` is called synchronously in a component's render 
      // function.
      Object.is(state[k], v) ? state : { ...state, [k]: v });
    // Clear any errors for this key that may have been set due to a previously
    // failed submission. You might want to change this behavior depending on
    // your desired UX.
    setErrors((errors) => ({ ...errors, [k]: undefined }));
  }, []);

  return {
    values,
    errors,
    isSubmitting,
    set,
    setMany: useCallback(
      (data: Partial<T>) =>
        // `setMany` just calls `set` for each entry in `data`.
        Object.entries(data).forEach(([k, v]) =>
          set(k as keyof T, v as T[keyof T])),
      [set],
    ),
    control: useCallback(
      <K extends keyof T>(k: K): FormValueController<T[K]> => ({
        value: values[k],
        // You can think of this as a curried `set()`.
        set: (v: T[K]) => set(k, v),
      }),
      [values, set],
    ),
    onSubmit: useCallback(
      (e?: SyntheticEvent) => {
        e?.preventDefault();
        const errors: FormErrors<T> = {};
        // Validation isn't required; we don't _have_ to pass in an `onValidate` 
        // function.
        onValidate?.(values, errors);
        if (Object.values(errors).some((e) => e !== undefined)) {
          setErrors(errors);
          return;
        }
        // Handling submission also isn't required; while it doesn't make much
        // sense for a production application, it might be nice to not have to
        // implement it right away during development.
        const submit = onSubmit?.(values);
        // If `onSubmit` returns a Promise instead of void (or undefined if
        // there's no `onSubmit` function), then handle the `submitting` state 
        // variable:
        if (submit) {
          setSubmitting(true);
          // Warning! This may throw a React warning if the component using this
          // hook unmounts (because the promise could resolve after unmount).
          // You may want to create another hook that can create promises that
          // don't resolve after a component unmounts.
          submit.then(() => setSubmitting(false));
        }
      },
      [onValidate, onSubmit, values],
    ),
    reset: useCallback(() => {
      // Clear everything.
      dispatch(() => initialValues);
      setErrors({});
    }, [initialValues]),
  };
}
```

There's a few things worth pointing out here, especially if you plan on modifying the code.

1. The `(this: void)` parameters ensure that we don't get any TypeScript or IDE warnings when we destructure the returned `Form` from `useForm()`. The only condition to using this is that we can't use `this` within the returned `Form` object; luckily, we don't need it.
2. The liberal use of `useCallback()` ensures that functions on the returned `Form` object don't get unnecessarily recreated every time a value changes. This is less about performance and more about allowing something like `set()` or `setMany()` to be used in a `useEffect()` hook and its dependency array.

## Conclusion

Be on the lookout for more opportunities to replace large dependencies with hooks of your own. You'll know how they work and how to extend them, all without worrying about other projects' breaking changes or their code licenses.
