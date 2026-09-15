// Sign-in block: renders the mock sign-in flow (provider chooser, or a
// provider-branded credential screen when ?provider= is present). All session
// and flow logic lives in scripts/auth.js so the header can reuse it.
import { renderSignInFlow } from '../../scripts/auth.js';

export default function decorate(block) {
  renderSignInFlow(block);
}
