import './SideMenu.css';

function SideMenu({ isOpen }) {
  return (
    <div className={`side-menu ${isOpen ? 'open' : ''}`}>
      <h2>Menu</h2>
      <ul>
        <li>Layer 1</li>
        <li>Layer 2</li>
        <li>Settings</li>
      </ul>
    </div>
  );
}

export default SideMenu;
