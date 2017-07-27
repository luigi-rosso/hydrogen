export default function bind(target, key, descriptor)
{
	let fn = descriptor.value;
	let definingProperty = false;
	return  {
		configurable: true,
		get() 
		{
			if (definingProperty || this === target.prototype || this.hasOwnProperty(key)) 
			{
				return fn;
			}

			let boundFn = fn.bind(this);
			definingProperty = true;
			Object.defineProperty(this, key, {
				value: boundFn,
				configurable: true,
				writable: true
			});
			definingProperty = false;
			return boundFn;
		}
	};
}