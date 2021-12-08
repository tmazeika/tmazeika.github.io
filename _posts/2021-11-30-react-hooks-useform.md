---
title: "React Hooks: Build Your Own useForm()"
---

Forms in React are particularly tedious to implement because each input component demands its own `useState()` hook and change handler. There's [a](https://final-form.org/react) [ton](https://react-hook-form.com/) [of](https://www.telerik.com/kendo-react-ui/components/form/) [libraries](https://formik.org/) out there that alleviate some of those pains and add validation utilities. But, unless you have a use case that calls for any of those advanced features, you're probably better off writing your own hook. After all, [a little copying is better than a little dependency](https://www.youtube.com/watch?v=PAAkCSZUG1c&t=9m28s).

## Usage

Before we get to the implementation, here's what we're trying to achieve:

<script src="https://gist.github.com/tmazeika/39f3401130f68b1c686c95cb622af957.js"></script>

The best part about this is that everything is fully type checked. Given the hook's `initialValues` option, we can guarantee that a value's type won't accidentally be changed (or be unexpectedly set to `undefined`, which is a whole [other problem](https://stackoverflow.com/questions/37427508/react-changing-an-uncontrolled-input)). See that `form.set('name', 5)` won't type check, but it would if the initial value of `name` was a number. Nor would `form.set('nmae', '...')` type check.

## Implementation

<script src="https://gist.github.com/tmazeika/a67b7b69b0c0eb6a037afd0693cf4224.js"></script>

There's a few things worth pointing out here, especially if you plan on modifying the code.

1. The `(this: void)` parameters ensure that we don't get any TypeScript or IDE warnings when we destructure the returned `Form` from `useForm()`. The only condition to using this is that we can't use `this` within the returned `Form` object; luckily, we don't need it.
2. The liberal use of `useCallback()` ensures that functions on the returned `Form` object don't get unnecessarily recreated every time a value changes. This is less about performance and more about allowing something like `set()` or `setMany()` to be used in a `useEffect()` hook and its dependency array.

## Conclusion

Be on the lookout for more opportunities to replace large dependencies with hooks of your own. You'll know how they work and how to extend them, all without worrying about other projects' breaking changes or their code licenses.
