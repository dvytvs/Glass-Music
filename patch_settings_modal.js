const fs = require('fs');

let code = fs.readFileSync('components/SettingsModal.tsx', 'utf8');

code = code.replace(
  "v1.9.0 Liquid Edition",
  "v2.0.8 Liquid Edition"
);

const old207 = `
                      <div className="border-b border-[var(--glass-border)] pb-6">
                          <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2 mb-2">
                              {t('version')} 2.0.7 ({t('current')}) <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full ml-2">{t('new')}</span>
                          </h3>
                          <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 text-sm leading-relaxed">
                              <li>{t('changelog_207_1')}</li>
                              <li>{t('changelog_207_2')}</li>
                              <li>{t('changelog_207_3')}</li>
                              <li>{t('changelog_207_4')}</li>
                              <li>{t('changelog_207_5')}</li>
                          </ul>
                      </div>
`;

const new208 = `
                      <div className="border-b border-[var(--glass-border)] pb-6">
                          <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2 mb-2">
                              {t('version')} 2.0.8 ({t('current')}) <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded-full ml-2">{t('new')}</span>
                          </h3>
                          <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 text-sm leading-relaxed">
                              <li>{t('changelog_208_1')}</li>
                              <li>{t('changelog_208_2')}</li>
                              <li>{t('changelog_208_3')}</li>
                          </ul>
                      </div>
                      <div className="border-b border-[var(--glass-border)] pb-6">
                          <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Версия 2.0.7</h3>
                          <ul className="list-disc list-inside text-[var(--text-muted)] space-y-2 text-sm leading-relaxed">
                              <li>{t('changelog_207_1')}</li>
                              <li>{t('changelog_207_2')}</li>
                              <li>{t('changelog_207_3')}</li>
                              <li>{t('changelog_207_4')}</li>
                              <li>{t('changelog_207_5')}</li>
                          </ul>
                      </div>
`;

code = code.replace(old207.trim(), new208.trim());

fs.writeFileSync('components/SettingsModal.tsx', code);
