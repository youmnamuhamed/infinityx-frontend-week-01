import { ModalRoot } from "./Modal";
import { ModalTrigger } from "./Trigger";
import { ModalPortal } from "./Portal";
import { ModalOverlay } from "./Overlay";
import { ModalContent } from "./Content";
import { ModalHeader } from "./Header";
import { ModalTitle } from "./Title";
import { ModalBody } from "./Body";
import { ModalFooter } from "./Footer";
import { ModalCloseButton } from "./CloseButton";

/**
 * Compound Modal Dialog.
 *
 * Usage:
 *   <Modal open={open} onOpenChange={setOpen}>
 *     <Modal.Trigger asChild>
 *       <Button variant="primary">Deploy Cluster</Button>
 *     </Modal.Trigger>
 *     <Modal.Portal>
 *       <Modal.Overlay />
 *       <Modal.Content size="lg">
 *         <Modal.Header>
 *           <Modal.Title>Confirm Deployment</Modal.Title>
 *           <Modal.CloseButton />
 *         </Modal.Header>
 *         <Modal.Body>...</Modal.Body>
 *         <Modal.Footer>
 *           <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
 *           <Button variant="danger">Confirm</Button>
 *         </Modal.Footer>
 *       </Modal.Content>
 *     </Modal.Portal>
 *   </Modal>
 */
export const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Portal: ModalPortal,
  Overlay: ModalOverlay,
  Content: ModalContent,
  Header: ModalHeader,
  Title: ModalTitle,
  Body: ModalBody,
  Footer: ModalFooter,
  CloseButton: ModalCloseButton,
});

export default Modal;
